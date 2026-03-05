"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
    const [typingUsers, setTypingUsers] = useState<
        Record<string, Set<string>>
    >({});
    const typingTimersRef = useRef<Record<string, NodeJS.Timeout>>({});

    // --- Socket.IO ---
    const { isConnected, joinChannel, leaveChannel, emitTyping, emitStopTyping } =
        useChatSocket({
            onNewMessage: (message) => {
                setMessages((prev) => {
                    if (prev.some((m) => m._id === message._id)) return prev;
                    if (message.channelId === selectedChannel?._id) {
                        return [...prev, message];
                    }
                    return prev;
                });
                // Update channel's last message preview
                setChannels((prev) =>
                    prev.map((ch) =>
                        ch._id === message.channelId
                            ? {
                                ...ch,
                                lastMessageAt: message.createdAt,
                                lastMessagePreview: message.content.slice(0, 80),
                            }
                            : ch
                    )
                );
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
        });

    // --- Fetch channels ---
    const fetchChannels = useCallback(async () => {
        try {
            setLoadingChannels(true);
            const data = await apiRequest<Channel[]>("/chat/channels");
            setChannels(data);
            if (data.length > 0 && !selectedChannel) {
                setSelectedChannel(data[0]);
            }
        } catch (err) {
            console.error("Failed to fetch channels:", err);
        } finally {
            setLoadingChannels(false);
        }
    }, [selectedChannel]);

    useEffect(() => {
        fetchChannels();
    }, [fetchChannels]);

    // --- Fetch messages when channel changes ---
    const fetchMessages = useCallback(async (channelId: string) => {
        try {
            setLoadingMessages(true);
            const data = await apiRequest<ChatMessage[]>(
                `/chat/channels/${channelId}/messages?limit=50`
            );
            setMessages(data.reverse());
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
        if (!selectedChannel) return;
        try {
            const body: Record<string, unknown> = { content };
            if (attachments?.length) body.attachments = attachments;

            await apiRequest(`/chat/channels/${selectedChannel._id}/messages`, {
                method: "POST",
                data: body,
            });
        } catch (err) {
            console.error("Failed to send message:", err);
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

    const handleSelectChannel = (channel: Channel) => {
        setSelectedChannel(channel);
    };

    const currentTyping = selectedChannel
        ? Array.from(typingUsers[selectedChannel._id] || [])
        : [];

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
                    channels={channels}
                    selectedChannelId={selectedChannel?._id || null}
                    onSelectChannel={handleSelectChannel}
                    onCreateChannel={() => setShowCreateChannel(true)}
                    loading={loadingChannels}
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
