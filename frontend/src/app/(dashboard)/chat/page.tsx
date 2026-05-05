"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import useSWR, { mutate as globalMutate, useSWRConfig } from "swr";
import useSWRInfinite from "swr/infinite";
import { useSearchParams } from "next/navigation";
import { fetcher } from "@/lib/fetcher";
import { useAuth } from "@/lib/auth-provider";
import { apiRequest } from "@/lib/api";
import type { Channel, ChatMessage } from "@/lib/types";
import { useChat } from "@/contexts/chat-context";
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
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [threadParent, setThreadParent] = useState<ChatMessage | null>(null);
    const [showChannelInfo, setShowChannelInfo] = useState(false);
    const [showSearch, setShowSearch] = useState(false);
    const [showCreateChannel, setShowCreateChannel] = useState(false);
    const { pusher, unreadCounts, clearUnread, joinChannel, leaveChannel, emitTyping, emitStopTyping, setCurrentChannelId } = useChat();
    const [typingUsers, setTypingUsers] = useState<Record<string, Set<string>>>({});
    const typingTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
    const selectedChannelIdRef = useRef<string | null>(null);
    const searchParams = useSearchParams();
    const urlChannelId = searchParams.get("channelId");
    const urlMessageId = searchParams.get("messageId");

    useEffect(() => {
        selectedChannelIdRef.current = selectedChannel?._id || null;
    }, [selectedChannel]);

    // --- SWR Hooks ---
    const { data: rawChannels, isLoading: loadingChannels } = useSWR<Channel[]>("/chat/channels", fetcher as any);
    const channels = rawChannels || [];

    const { data: membersObj } = useSWR<{ members: any[] }>("/auth/workspaces/members", fetcher as any);
    const workspaceMembers = membersObj?.members || [];

    // Infinite Loading for Messages
    const getKey = (pageIndex: number, previousPageData: any) => {
        if (!selectedChannel) return null;
        // If we reached the end, don't fetch anymore
        if (pageIndex > 0 && !previousPageData?.nextCursor) return null;

        const baseUrl = `/chat/channels/${selectedChannel._id}/messages?limit=50`;
        if (pageIndex === 0) return baseUrl;
        return `${baseUrl}&cursor=${previousPageData.nextCursor}`;
    };

    const { 
        data: infiniteData, 
        size, 
        setSize, 
        mutate: mutateMessages,
        isValidating: validatingMessages, 
        isLoading: loadingMessages 
    } = useSWRInfinite(getKey, fetcher as any, {
        revalidateFirstPage: false,
        persistSize: true
    });

    const messages = useMemo(() => {
        if (!infiniteData) return [];
        // Flatten pages. Since we fetch newest first (sort -1 in backend), 
        // the first page has the newest messages.
        // To display [oldest -> newest], we reverse the page order then flatten.
        return [...infiniteData].reverse().flatMap(page => page.messages);
    }, [infiniteData]);

    const hasMore = infiniteData ? infiniteData[infiniteData.length - 1]?.hasMore : false;
    const isFetchingMore = validatingMessages && size > 1;

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

    useEffect(() => {
        if (channels.length > 0 && !selectedChannelIdRef.current) {
            if (urlChannelId) {
                const target = channels.find(c => c._id === urlChannelId);
                if (target) setSelectedChannel(target);
                else setSelectedChannel(channels[0]);
            } else {
                setSelectedChannel(channels[0]);
            }
        } else if (urlChannelId && channels.length > 0 && selectedChannel?._id !== urlChannelId) {
            const target = channels.find(c => c._id === urlChannelId);
            if (target) setSelectedChannel(target);
        }
    }, [channels, urlChannelId, selectedChannel?._id]);

    // --- Pusher ---
    useEffect(() => {
        if (!pusher || !selectedChannel?._id) return;

        const channelId = selectedChannel._id;
        const channel = pusher.subscribe(`channel-${channelId}`);

        const onNewMessage = (message: ChatMessage) => {
            mutateMessages((prev: any) => {
                if (!prev) return prev;
                // Add to the first page (which contains the most recent messages)
                const newPages = [...prev];
                const firstPage = newPages[0];
                if (firstPage && !firstPage.messages.some((m: any) => m._id === message._id)) {
                    newPages[0] = { 
                        ...firstPage, 
                        messages: [...firstPage.messages, message] 
                    };
                }
                return newPages;
            }, false);
            
            globalMutate("/chat/channels", (prev: Channel[] | undefined) => {
                if (!prev) return prev;
                const updated = prev.map((ch) =>
                    ch._id === message.channelId
                        ? {
                            ...ch,
                            lastMessageAt: message.createdAt,
                            lastMessagePreview: message.type === 'file' ? 'Sent a file' : message.content.slice(0, 80),
                        }
                        : ch
                );
                return updated.sort((a, b) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());
            }, false);
        };

        const onMessageDeleted = ({ messageId, channelId: msgChannelId }: { messageId: string, channelId: string }) => {
            mutateMessages((prev: any) => {
                if (!prev) return prev;
                return prev.map((page: any) => ({
                    ...page,
                    messages: page.messages.map((m: any) =>
                        m._id === messageId ? { ...m, isDeleted: true, content: "This message was deleted." } : m
                    )
                }));
            }, false);
            
            globalMutate("/chat/channels", (prev: Channel[] | undefined) => {
                if (!prev) return prev;
                return prev.map(ch => 
                    ch._id === msgChannelId 
                        ? { ...ch, lastMessagePreview: "This message was deleted." }
                        : ch
                );
            }, false);
        };

        const onMessageEdited = (updated: ChatMessage) => {
            mutateMessages((prev: any) => {
                if (!prev) return prev;
                return prev.map((page: any) => ({
                    ...page,
                    messages: page.messages.map((m: any) => (m._id === updated._id ? updated : m))
                }));
            }, false);
        };

        const onReactionUpdated = (updated: { _id: string; reactions: any[] }) => {
            mutateMessages((prev: any) => {
                if (!prev) return prev;
                return prev.map((page: any) => ({
                    ...page,
                    messages: page.messages.map((m: any) => (m._id === updated._id ? { ...m, reactions: updated.reactions } : m))
                }));
            }, false);
        };

        const onUserTyping = ({ channelId: _chId, userId }: { channelId: string, userId: string }) => {
            if (userId === user?.id) return;
            setTypingUsers((prev) => {
                const set = new Set(prev[channelId] || []);
                set.add(userId);
                return { ...prev, [channelId]: set };
            });
            const key = `${channelId}:${userId}`;
            clearTimeout(typingTimersRef.current[key]);
            typingTimersRef.current[key] = setTimeout(() => {
                setTypingUsers((prev) => {
                    const set = new Set(prev[channelId] || []);
                    set.delete(userId);
                    return { ...prev, [channelId]: set };
                });
            }, 3000);
        };

        const onUserStopTyping = ({ channelId: _chId, userId }: { channelId: string, userId: string }) => {
            setTypingUsers((prev) => {
                const set = new Set(prev[channelId] || []);
                set.delete(userId);
                return { ...prev, [channelId]: set };
            });
        };

        const onThreadReply = ({ parentId, message }: { parentId: string, message: ChatMessage }) => {
            mutateMessages((prev: any) => {
                if (!prev) return prev;
                return prev.map((page: any) => ({
                    ...page,
                    messages: page.messages.map((m: any) => m._id === parentId ? { ...m, replyCount: (m.replyCount || 0) + 1 } : m)
                }));
            }, false);
        };

        const onChannelUpdated = (channelData: Channel) => {
            globalMutate("/chat/channels", (prev: Channel[] | undefined) => {
                if (!prev) return prev;
                return prev.map((c) => c._id === channelData._id ? channelData : c);
            }, false);
        };

        const onChannelDeleted = ({ channelId: msgChannelId }: { channelId: string }) => {
            globalMutate("/chat/channels", (prev: Channel[] | undefined) => {
                if (!prev) return prev;
                return prev.filter((c) => c._id !== msgChannelId);
            }, false);
        };

        const onChannelArchived = ({ channelId: msgChannelId }: { channelId: string }) => {
            globalMutate("/chat/channels", (prev: Channel[] | undefined) => {
                if (!prev) return prev;
                return prev.filter((c) => c._id !== msgChannelId);
            }, false);
        };

        channel.bind("new-message", onNewMessage);
        channel.bind("message-deleted", onMessageDeleted);
        channel.bind("message-edited", onMessageEdited);
        channel.bind("reaction-updated", onReactionUpdated);
        channel.bind("user-typing", onUserTyping);
        channel.bind("user-stop-typing", onUserStopTyping);
        channel.bind("thread-reply", onThreadReply);
        channel.bind("channel-updated", onChannelUpdated);
        channel.bind("channel-deleted", onChannelDeleted);
        channel.bind("channel-archived", onChannelArchived);

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(`channel-${channelId}`);
        };
    }, [pusher, selectedChannel?._id, user?.id]);

    useEffect(() => {
        if (!pusher || !user?.id) return;
        
        const userChannel = pusher.subscribe(`user-${user.id}`);

        const onChannelCreated = (channelData: Channel) => {
            globalMutate("/chat/channels", (prev: Channel[] | undefined) => {
                if (!prev) return prev;
                if (prev.some((c) => c._id === channelData._id)) return prev;
                return [channelData, ...prev];
            }, false);
        };

        const onChannelRemoved = ({ channelId }: { channelId: string }) => {
            globalMutate("/chat/channels", (prev: Channel[] | undefined) => {
                if (!prev) return prev;
                return prev.filter((c) => c._id !== channelId);
            }, false);
        };

        userChannel.bind("channel-created", onChannelCreated);
        userChannel.bind("channel-removed", onChannelRemoved);

        return () => {
            userChannel.unbind_all();
            pusher.unsubscribe(`user-${user.id}`);
        };
    }, [pusher, user?.id]);



    useEffect(() => {
        if (selectedChannel) {
            clearUnread(selectedChannel._id);
            setCurrentChannelId(selectedChannel._id);
            joinChannel(selectedChannel._id);
            setThreadParent(null);
            setShowChannelInfo(false);
        } else {
            setCurrentChannelId(null);
        }
        return () => {
            if (selectedChannel) {
                leaveChannel(selectedChannel._id);
            }
        };
    }, [selectedChannel, joinChannel, leaveChannel, clearUnread, setCurrentChannelId]);

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

        mutateMessages((prev: any) => {
            if (!prev) return prev;
            const newPages = [...prev];
            newPages[0] = { ...newPages[0], messages: [...newPages[0].messages, optimisticMessage] };
            return newPages;
        }, false);

        try {
            const body: Record<string, unknown> = { content };
            if (attachments?.length) body.attachments = attachments;

            const savedMessage = await apiRequest<ChatMessage>(`/chat/channels/${selectedChannel._id}/messages`, {
                method: "POST",
                data: body,
            });

            // Replace or remove optimistic message
            mutateMessages((prev: any) => {
                if (!prev) return prev;
                return prev.map((page: any, i: number) => {
                    if (i === 0) {
                        const exists = page.messages.some((m: ChatMessage) => m._id === savedMessage._id && m._id !== tempId);
                        if (exists) {
                            return { ...page, messages: page.messages.filter((m: ChatMessage) => m._id !== tempId) };
                        }
                        return { ...page, messages: page.messages.map((m: ChatMessage) => (m._id === tempId ? savedMessage : m)) };
                    }
                    return page;
                });
            }, false);
        } catch (err) {
            console.error("Failed to send message:", err);
            // Revert message on failure
            mutateMessages((prev: any) => {
                if (!prev) return prev;
                return prev.map((page: any) => ({
                    ...page,
                    messages: page.messages.filter((m: ChatMessage) => m._id !== tempId)
                }));
            }, false);
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
                    globalMutate("/chat/channels", (prev: Channel[] | undefined) => {
                        if (!prev) return prev;
                        if (prev.some((c) => c._id === realChannel._id)) return prev;
                        return [realChannel, ...prev];
                    }, false);
                } catch (err) {
                    console.error("Failed to vivify synthetic DM:", err);
                }
            }
            return;
        }

        setSelectedChannel(channel);
        clearUnread(channel._id);
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
                            loading={loadingMessages && size === 1}
                            hasMore={hasMore}
                            isLoadingMore={isFetchingMore}
                            onLoadMore={() => setSize(size + 1)}
                            currentUserId={user?.id || ""}
                            onReply={(msg) => setThreadParent(msg)}
                            onDelete={handleDeleteMessage}
                            onEdit={handleEditMessage}
                            onReaction={handleToggleReaction}
                            highlightMessageId={urlMessageId}
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
                    onUpdated={() => globalMutate("/chat/channels")}
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
                        globalMutate("/chat/channels", (prev: Channel[] | undefined) => {
                            if (!prev) return prev;
                            return [newChannel, ...prev];
                        }, false);
                        setSelectedChannel(newChannel);
                        setShowCreateChannel(false);
                    }}
                />
            )}
        </div>
    );
}
