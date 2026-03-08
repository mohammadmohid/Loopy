"use client";

import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import { format } from "date-fns";
import { X, Loader2, Send, SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactionPicker } from "./reaction-picker";

interface ThreadPanelProps {
    parentMessage: ChatMessage;
    channelId: string;
    currentUserId: string;
    onClose: () => void;
    onReaction: (messageId: string, emoji: string) => void;
}

export function ThreadPanel({
    parentMessage,
    channelId,
    currentUserId,
    onClose,
    onReaction,
}: ThreadPanelProps) {
    const [replies, setReplies] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyContent, setReplyContent] = useState("");
    const [sending, setSending] = useState(false);
    const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(
        null
    );
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchReplies = async () => {
            try {
                setLoading(true);
                const data = await apiRequest<{ parent: ChatMessage; replies: ChatMessage[] }>(
                    `/chat/messages/${parentMessage._id}/thread`
                );
                setReplies(data.replies);
            } catch (err) {
                console.error("Failed to fetch thread:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReplies();
    }, [parentMessage._id]);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [replies]);

    const handleSendReply = async () => {
        if (!replyContent.trim()) return;
        try {
            setSending(true);
            const newReply = await apiRequest<ChatMessage>(
                `/chat/channels/${channelId}/messages`,
                {
                    method: "POST",
                    data: {
                        content: replyContent.trim(),
                        threadParentId: parentMessage._id,
                    },
                }
            );
            setReplies((prev) => [...prev, newReply]);
            setReplyContent("");
        } catch (err) {
            console.error("Failed to send reply:", err);
        } finally {
            setSending(false);
        }
    };

    const parentName = parentMessage.sender?.profile
        ? `${parentMessage.sender.profile.firstName} ${parentMessage.sender.profile.lastName}`
        : "Unknown";

    return (
        <div className="w-80 border-l border-neutral-200 flex flex-col bg-white shrink-0">
            {/* Header */}
            <div className="h-14 border-b border-neutral-200 px-4 flex items-center justify-between shrink-0">
                <h4 className="font-semibold text-foreground text-sm">Thread</h4>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-neutral-100 rounded transition-colors"
                >
                    <X className="w-4 h-4 text-neutral-500" />
                </button>
            </div>

            {/* Parent Message */}
            <div className="px-4 py-3 border-b border-neutral-100 bg-neutral-50/50">
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-[9px] font-semibold text-primary">
                            {parentMessage.sender?.profile?.firstName?.[0]?.toUpperCase() ||
                                "?"}
                        </span>
                    </div>
                    <span className="text-xs font-semibold text-foreground">
                        {parentName}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                        {format(new Date(parentMessage.createdAt), "h:mm a")}
                    </span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                    {parentMessage.content}
                </p>
                <p className="text-[10px] text-neutral-400 mt-1">
                    {replies.length} {replies.length === 1 ? "reply" : "replies"}
                </p>
            </div>

            {/* Replies */}
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
                {loading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-neutral-300" />
                    </div>
                ) : (
                    replies.map((reply) => {
                        const name = reply.sender?.profile
                            ? `${reply.sender.profile.firstName} ${reply.sender.profile.lastName}`
                            : "Unknown";
                        return (
                            <div key={reply._id} className="group relative">
                                <div className="flex items-start gap-2">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-[9px] font-semibold text-primary">
                                            {reply.sender?.profile?.firstName?.[0]?.toUpperCase() ||
                                                "?"}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-xs font-semibold text-foreground">
                                                {name}
                                            </span>
                                            <span className="text-[10px] text-neutral-400">
                                                {format(new Date(reply.createdAt), "h:mm a")}
                                            </span>
                                        </div>
                                        <p className="text-sm text-foreground whitespace-pre-wrap [word-break:break-word]">
                                            {reply.isDeleted ? (
                                                <span className="text-neutral-400 italic">
                                                    This message was deleted
                                                </span>
                                            ) : (
                                                reply.content
                                            )}
                                        </p>

                                        {/* Reactions */}
                                        {reply.reactions && reply.reactions.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {reply.reactions.map((r, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => onReaction(reply._id, r.emoji)}
                                                        className={cn(
                                                            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] border",
                                                            r.users.includes(currentUserId)
                                                                ? "bg-primary/10 border-primary/30 text-primary"
                                                                : "bg-neutral-50 border-neutral-200 text-neutral-600"
                                                        )}
                                                    >
                                                        {r.emoji} {r.users.length}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Reaction button */}
                                    <button
                                        onClick={() =>
                                            setReactionPickerFor(
                                                reactionPickerFor === reply._id ? null : reply._id
                                            )
                                        }
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-100 rounded transition-all"
                                    >
                                        <SmilePlus className="w-3 h-3 text-neutral-400" />
                                    </button>
                                </div>

                                {reactionPickerFor === reply._id && (
                                    <div className="absolute right-0 top-6 z-20">
                                        <ReactionPicker
                                            onSelect={(emoji) => {
                                                onReaction(reply._id, emoji);
                                                setReactionPickerFor(null);
                                            }}
                                            onClose={() => setReactionPickerFor(null)}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
                <div ref={endRef} />
            </div>

            {/* Reply Input */}
            <div className="border-t border-neutral-200 p-3">
                <div className="flex items-end gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
                    <input
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply();
                            }
                        }}
                        placeholder="Reply..."
                        className="flex-1 bg-transparent text-sm outline-none border-none py-0.5 placeholder:text-neutral-400"
                    />
                    <button
                        onClick={handleSendReply}
                        disabled={sending || !replyContent.trim()}
                        className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            replyContent.trim()
                                ? "bg-primary text-white hover:bg-primary-dark"
                                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                        )}
                    >
                        {sending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Send className="w-3.5 h-3.5" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
