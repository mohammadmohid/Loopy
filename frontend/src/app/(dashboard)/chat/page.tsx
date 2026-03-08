"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "@/lib/auth-provider";
import { apiRequest } from "@/lib/api";
import type { Channel, ChatMessage } from "@/lib/types";
import { useChatSocket } from "./use-chat-socket";
import { ChannelList } from "./_components/channel-list";
import { MessageList } from "./_components/message-list";
import { MessageInput } from "./_components/message-input";
import { ThreadPanel } from "./_components/thread-panel";
import { ChannelInfoPanel } from "./_components/channel-info-panel";
import { ChatSearch } from "./_components/chat-search";
import { CreateChannelDialog } from "./_components/create-channel-dialog";
import { MessageCircle, Search, X } from "lucide-react";

export default function ChatPage() {
    const { user } = useAuth();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [threadParent, setThreadParent] = useState<ChatMessage | null>(null);
    const [showChannelInfo, setShowChannelInfo] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const [loadingChannels, setLoadingChannels] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [typingUsers, setTypingUsers] = useState<Record<string, Set<string>>>({});
    const typingTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
    const selectedChannelIdRef = useRef<string | null>(null);

    useEffect(() => {
        selectedChannelIdRef.current = selectedChannel?._id || null;
    }, [selectedChannel]);

    // Derived DMs list combining existing direct channels + workspace members not yet individually messaged
    const directChannels = useMemo(() => {
        const existingDMs = channels.filter((c) => c.type === "direct" || c.type === "private");
        const existingDMMemberIds = new Set<string>();
        existingDMs.forEach(c => {
            c.members.forEach(m => {
                const uid = (m.user as any)?._id?.toString() || (m.user as any)?.toString();
                if (uid && uid !== user?.id) existingDMMemberIds.add(uid);
            });
        });

        const syntheticDMs: Channel[] = [];
        workspaceMembers.forEach(member => {
            if (member.id !== user?.id && !existingDMMemberIds.has(member.id)) {
                syntheticDMs.push({
                    _id: `synthetic_${member.id}`,
                    name: `${member.firstName} ${member.lastName}`,
                    type: "direct",
                    members: [
                        { user: { _id: user?.id } as any, role: "admin", joinedAt: new Date().toISOString() },
                        { 
                            user: { _id: member.id, profile: { firstName: member.firstName, lastName: member.lastName, avatarUrl: member.avatarUrl } } as any, 
                            role: "member", 
                            joinedAt: new Date().toISOString() 
                        }
                    ],
                    workspaceId: user?.workspaceId || "",
                    createdBy: user?.id || "",
                    isArchived: false,
                    restrictedChat: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
        });
        
        return [...existingDMs, ...syntheticDMs];
    }, [channels, workspaceMembers, user?.id, user?.workspaceId]);

    // --- Socket.IO ---
    const { isConnected, joinChannel, leaveChannel, emitTyping, emitStopTyping } =
        useChatSocket({
            onNewMessage: (message) => {
                const currentSelectedId = selectedChannelIdRef.current;
                setMessages((prev) => {
                    if (prev.some((m) => m._id === message._id)) return prev;
                    if (message.channelId === currentSelectedId) {
                        return [...prev, message];
                    }
                    return prev;
                });
                
                if (message.channelId !== currentSelectedId) {
                    setUnreadCounts(prev => ({ ...prev, [message.channelId]: (prev[message.channelId] || 0) + 1 }));
                }

                // Update channel's last message preview and sort
                setChannels((prev) => {
                    const updated = prev.map((ch) =>
                        ch._id === message.channelId
                            ? {
                                ...ch,
                                lastMessageAt: message.createdAt,
                                lastMessagePreview: message.content.slice(0, 80),
                            }
                            : ch
                    );
                    return updated.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
                });
            },
            onMessageDeleted: ({ messageId }) => {
                setMessages((prev) =>
                    prev.map((m) =>
                        m._id === messageId ? { ...m, isDeleted: true, content: "" } : m
                    )
                );
            },
            onMessageEdited: (updated) => {
                setMessages((prev) =>
                    prev.map((m) => (m._id === updated._id ? updated : m))
                );
            },
            onReactionUpdated: (updated) => {
                setMessages((prev) =>
                    prev.map((m) => (m._id === updated._id ? updated : m))
                );
            },
            onUserTyping: ({ channelId, userId }) => {
                if (userId === user?.id) return;
                setTypingUsers((prev) => {
                    const set = new Set(prev[channelId] || []);
                    set.add(userId);
                    return { ...prev, [channelId]: set };
                });
                // Auto-clear after 3s
                const key = `${channelId}:${userId}`;
                clearTimeout(typingTimersRef.current[key]);
                typingTimersRef.current[key] = setTimeout(() => {
                    setTypingUsers((prev) => {
                        const set = new Set(prev[channelId] || []);
                        set.delete(userId);
                        return { ...prev, [channelId]: set };
                    });
                }, 3000);
            },
            onUserStopTyping: ({ channelId, userId }) => {
                setTypingUsers((prev) => {
                    const set = new Set(prev[channelId] || []);
                    set.delete(userId);
                    return { ...prev, [channelId]: set };
                });
            },
            onThreadReply: ({ parentId, message }) => {
                setMessages((prev) => 
                    prev.map((m) => m._id === parentId ? { ...m, replyCount: (m.replyCount || 0) + 1 } : m)
                );
            },
            onChannelCreated: (channel) => {
                setChannels((prev) => {
                    if (prev.some((c) => c._id === channel._id)) return prev;
                    return [channel, ...prev];
                });
            },
            onChannelUpdated: (channel) => {
                setChannels((prev) => prev.map((c) => c._id === channel._id ? channel : c));
            },
            onChannelDeleted: ({ channelId }) => {
                setChannels((prev) => prev.filter((c) => c._id !== channelId));
                if (selectedChannelIdRef.current === channelId) {
                    setSelectedChannel(null); // Wait, how to change selectedChannel from a closure?
                    // Safe approach: we can't reliably call setSelectedChannel here if we don't know the full state. 
                    // Let's use functional update for selectedChannel but since it's a direct setter, we'll let useEffect handle cleanup if needed.
                }
            },
            onChannelArchived: ({ channelId }) => {
                setChannels((prev) => prev.filter((c) => c._id !== channelId));
            },
            onChannelRemoved: ({ channelId }) => {
                setChannels((prev) => prev.filter((c) => c._id !== channelId));
            },
        });

    // --- Fetch channels ---
    const fetchChannels = useCallback(async () => {
        try {
            setLoadingChannels(true);
            const [data, membersData] = await Promise.all([
                apiRequest<Channel[]>("/chat/channels"),
                apiRequest<{ members: any[] }>("/auth/workspaces/members").catch(()=>({members:[]})),
            ]);
            setChannels(data);
            setWorkspaceMembers(membersData.members);
            if (data.length > 0 && !selectedChannelIdRef.current) {
                setSelectedChannel(data[0]);
            }
        } catch (err) {
            console.error("Failed to fetch channels:", err);
        } finally {
            setLoadingChannels(false);
        }
    }, []);

    useEffect(() => {
        fetchChannels();
    }, [fetchChannels]);

    // --- Fetch messages when channel changes ---
    const fetchMessages = useCallback(async (channelId: string) => {
        try {
            setLoadingMessages(true);
            const data = await apiRequest<{ messages: ChatMessage[]; hasMore: boolean; nextCursor: string | null }>(
                `/chat/channels/${channelId}/messages?limit=50`
            );
            setMessages(data.messages);
        } catch (err) {
            console.error("Failed to fetch messages:", err);
        } finally {
            setLoadingMessages(false);
        }
    }, []);

    useEffect(() => {
        if (selectedChannel) {
            fetchMessages(selectedChannel._id);
            joinChannel(selectedChannel._id);
            setThreadParent(null);
            setShowChannelInfo(false);
        }
        return () => {
            if (selectedChannel) {
                leaveChannel(selectedChannel._id);
            }
        };
    }, [selectedChannel, fetchMessages, joinChannel, leaveChannel]);

    // --- Message actions ---
    const handleSendMessage = async (
        content: string,
        attachments?: { name: string; key: string; size: number; mimeType: string }[]
    ) => {
        if (!selectedChannel || !user) return;

        // Optimistic UI
        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: ChatMessage = {
            _id: tempId,
            channelId: selectedChannel._id,
            sender: {
                _id: user.id,
                email: user.email,
                profile: {
                    firstName: user.profile?.firstName || "",
                    lastName: user.profile?.lastName || "",
                    avatarUrl: user.profile?.avatarUrl || "",
                }
            },
            content,
            type: attachments?.length && !content ? "file" : "text",
            replyCount: 0,
            mentions: [],
            reactions: [],
            attachments: attachments || [],
            isEdited: false,
            isDeleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, optimisticMessage]);

        try {
            const body: Record<string, unknown> = { content };
            if (attachments?.length) body.attachments = attachments;

            const savedMessage = await apiRequest<ChatMessage>(`/chat/channels/${selectedChannel._id}/messages`, {
                method: "POST",
                data: body,
            });

            // Replace or remove optimistic message
            setMessages((prev) => {
                const exists = prev.some((m) => m._id === savedMessage._id && m._id !== tempId);
                if (exists) {
                    return prev.filter((m) => m._id !== tempId);
                }
                return prev.map((m) => (m._id === tempId ? savedMessage : m));
            });
        } catch (err) {
            console.error("Failed to send message:", err);
            // Revert message on failure
            setMessages((prev) => prev.filter((m) => m._id !== tempId));
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        try {
            await apiRequest(`/chat/messages/${messageId}`, { method: "DELETE" });
        } catch (err) {
            console.error("Failed to delete message:", err);
        }
    };

    const handleEditMessage = async (messageId: string, content: string) => {
        try {
            await apiRequest(`/chat/messages/${messageId}`, {
                method: "PATCH",
                data: { content },
            });
        } catch (err) {
            console.error("Failed to edit message:", err);
        }
    };

    const handleToggleReaction = async (messageId: string, emoji: string) => {
        try {
            await apiRequest(`/chat/messages/${messageId}/reactions`, {
                method: "POST",
                data: { emoji },
            });
        } catch (err) {
            console.error("Failed to toggle reaction:", err);
        }
    };

    const handleSelectChannel = async (channel: Channel) => {
        if (channel._id.startsWith("synthetic_")) {
            const targetMember = channel.members.find(
                (m) => ((m.user as any)?._id || (m.user as any)?.id) !== user?.id
            );
            const targetMemberId = (targetMember?.user as any)?._id || (targetMember?.user as any)?.id;
            
            if (targetMemberId) {
                try {
                    const realChannel = await apiRequest<Channel>("/chat/channels", {
                        method: "POST",
                        data: {
                            name: channel.name,
                            type: "direct",
                            memberIds: [targetMemberId]
                        }
                    });
                    setSelectedChannel(realChannel);
                    setChannels((prev) => {
                        if (prev.some((c) => c._id === realChannel._id)) return prev;
                        return [realChannel, ...prev];
                    });
                } catch (err) {
                    console.error("Failed to vivify synthetic DM:", err);
                }
            }
            return;
        }

        setSelectedChannel(channel);
        setUnreadCounts(prev => {
            if (!prev[channel._id]) return prev;
            const updated = { ...prev };
            delete updated[channel._id];
            return updated;
        });
    };

    const currentTyping = selectedChannel
        ? Array.from(typingUsers[selectedChannel._id] || [])
        : [];

    const isPrivileged = user?.workspaceRole === "ADMIN" || user?.workspaceRole === "PROJECT_MANAGER";

    return (
        <div className="flex h-[calc(100dvh-73px)] -m-6 bg-background">
            {/* Left — Channel List */}
            <div className="w-72 border-r border-neutral-200 flex flex-col shrink-0">
                <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">Messages</h2>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setShowSearch(true)}
                            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
                            title="Search messages"
                        >
                            <Search className="w-4 h-4 text-neutral-500" />
                        </button>
                    </div>
                </div>
                <ChannelList
                    channels={useMemo(() => {
                        const existingNonDMs = channels.filter(c => c.type !== "direct" && c.type !== "private");
                        return [...existingNonDMs, ...directChannels];
                    }, [channels, directChannels])}
                    selectedChannelId={selectedChannel?._id || null}
                    onSelectChannel={handleSelectChannel}
                    onCreateChannel={isPrivileged ? () => setShowCreateChannel(true) : undefined}
                    loading={loadingChannels}
                    unreadCounts={unreadCounts}
                />
            </div>

            {/* Center — Messages */}
            <div className="flex-1 flex flex-col min-w-0">
                {selectedChannel ? (
                    <>
                        {/* Channel Header */}
                        <div className="h-14 border-b border-neutral-200 px-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-neutral-400 text-lg">#</span>
                                <h3 className="font-semibold text-foreground">
                                    {selectedChannel.name}
                                </h3>
                                {selectedChannel.description && (
                                    <span className="text-sm text-neutral-400 hidden sm:block">
                                        — {selectedChannel.description}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setShowChannelInfo((prev) => !prev)}
                                className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-500 hover:text-foreground"
                            >
                                <MessageCircle className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Message Feed */}
                        <MessageList
                            messages={messages}
                            loading={loadingMessages}
                            currentUserId={user?.id || ""}
                            onReply={(msg) => setThreadParent(msg)}
                            onDelete={handleDeleteMessage}
                            onEdit={handleEditMessage}
                            onReaction={handleToggleReaction}
                        />

                        {/* Typing Indicator */}
                        {currentTyping.length > 0 && (
                            <div className="px-4 py-1 text-xs text-neutral-400 italic">
                                {currentTyping.length === 1
                                    ? "Someone is typing..."
                                    : `${currentTyping.length} people are typing...`}
                            </div>
                        )}

                        {/* Message Input */}
                        <MessageInput
                            channelId={selectedChannel._id}
                            members={selectedChannel.members}
                            onSend={handleSendMessage}
                            onTyping={() => emitTyping(selectedChannel._id)}
                            onStopTyping={() => emitStopTyping(selectedChannel._id)}
                            disabled={selectedChannel.restrictedChat && !isPrivileged}
                            disabledReason="Only admins and managers can send messages in this channel"
                        />
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center space-y-3">
                            <MessageCircle className="w-12 h-12 text-neutral-300 mx-auto" />
                            <p className="text-neutral-400 text-sm">
                                Select a channel to start chatting
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right — Thread or Info Panel */}
            {threadParent && selectedChannel && (
                <ThreadPanel
                    parentMessage={threadParent}
                    channelId={selectedChannel._id}
                    currentUserId={user?.id || ""}
                    onClose={() => setThreadParent(null)}
                    onReaction={handleToggleReaction}
                />
            )}

            {showChannelInfo && selectedChannel && (
                <ChannelInfoPanel
                    channel={selectedChannel}
                    currentUserId={user?.id || ""}
                    onClose={() => setShowChannelInfo(false)}
                    onUpdated={fetchChannels}
                />
            )}

            {/* Search Overlay */}
            {showSearch && (
                <ChatSearch
                    onClose={() => setShowSearch(false)}
                    onNavigateToMessage={(channelId, messageId) => {
                        const ch = channels.find((c) => c._id === channelId);
                        if (ch) {
                            setSelectedChannel(ch);
                            setShowSearch(false);
                        }
                    }}
                />
            )}

            {/* Create Channel Dialog */}
            {showCreateChannel && (
                <CreateChannelDialog
                    onClose={() => setShowCreateChannel(false)}
                    onCreated={(newChannel) => {
                        setChannels((prev) => [newChannel, ...prev]);
                        setSelectedChannel(newChannel);
                        setShowCreateChannel(false);
                    }}
                />
            )}
        </div>
    );
}
