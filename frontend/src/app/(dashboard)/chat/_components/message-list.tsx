"use client";

import { useRef, useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import {
    MessageSquare,
    Pencil,
    Trash2,
    SmilePlus,
    Loader2,
    FileText,
    Paperclip,
    Download,
} from "lucide-react";
import { ReactionPicker } from "./reaction-picker";

interface MessageListProps {
    messages: ChatMessage[];
    loading: boolean;
    currentUserId: string;
    onReply: (message: ChatMessage) => void;
    onDelete: (messageId: string) => void;
    onEdit: (messageId: string, content: string) => void;
    onReaction: (messageId: string, emoji: string) => void;
}

export function MessageList({
    messages,
    loading,
    currentUserId,
    onReply,
    onDelete,
    onEdit,
    onReaction,
}: MessageListProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [reactionPickerFor, setReactionPickerFor] = useState<string | null>(
        null
    );

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-300" />
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-2">
                    <MessageSquare className="w-10 h-10 text-neutral-200 mx-auto" />
                    <p className="text-neutral-400 text-sm">
                        No messages yet. Start the conversation!
                    </p>
                </div>
            </div>
        );
    }

    const formatDateSeparator = (dateStr: string) => {
        const date = new Date(dateStr);
        if (isToday(date)) return "Today";
        if (isYesterday(date)) return "Yesterday";
        return format(date, "MMMM d, yyyy");
    };

    const shouldShowDateSeparator = (index: number): boolean => {
        if (index === 0) return true;
        return !isSameDay(
            new Date(messages[index].createdAt),
            new Date(messages[index - 1].createdAt)
        );
    };

    const shouldGroupWithPrevious = (index: number): boolean => {
        if (index === 0) return false;
        const curr = messages[index];
        const prev = messages[index - 1];
        if (curr.sender._id !== prev.sender._id) return false;
        const timeDiff =
            new Date(curr.createdAt).getTime() -
            new Date(prev.createdAt).getTime();
        return timeDiff < 5 * 60 * 1000; // 5 minutes
    };

    const handleEditSubmit = (messageId: string) => {
        if (editContent.trim()) {
            onEdit(messageId, editContent.trim());
        }
        setEditingMessageId(null);
        setEditContent("");
    };

    return (
        <div
            ref={containerRef}
            className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5"
        >
            {messages.map((msg, idx) => {
                const showDate = shouldShowDateSeparator(idx);
                const grouped = shouldGroupWithPrevious(idx);
                const isOwn = msg.sender._id === currentUserId;
                const senderName = msg.sender?.profile
                    ? `${msg.sender.profile.firstName} ${msg.sender.profile.lastName}`
                    : msg.sender?.email || "Unknown";

                return (
                    <div key={msg._id}>
                        {/* Date Separator */}
                        {showDate && (
                            <div className="flex items-center gap-3 py-3">
                                <div className="flex-1 h-px bg-neutral-200" />
                                <span className="text-xs font-medium text-neutral-400 px-2">
                                    {formatDateSeparator(msg.createdAt)}
                                </span>
                                <div className="flex-1 h-px bg-neutral-200" />
                            </div>
                        )}

                        {/* System Message */}
                        {msg.type === "system" ? (
                            <div className="py-1 text-center">
                                <span className="text-xs text-neutral-400 italic">
                                    {msg.content}
                                </span>
                            </div>
                        ) : (
                            /* Regular Message */
                            <div
                                className={cn(
                                    "group relative flex gap-3 rounded-lg px-2 py-1 transition-colors",
                                    hoveredMessageId === msg._id && "bg-neutral-50"
                                )}
                                onMouseEnter={() => setHoveredMessageId(msg._id)}
                                onMouseLeave={() => {
                                    setHoveredMessageId(null);
                                    setReactionPickerFor(null);
                                }}
                            >
                                {/* Avatar */}
                                {!grouped ? (
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 overflow-hidden relative border border-transparent">
                                        {msg.sender?.profile?.avatarUrl && /^https?:\/\//.test(msg.sender.profile.avatarUrl) ? (
                                            <Image
                                                src={msg.sender.profile.avatarUrl}
                                                alt={senderName}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <span className="text-xs font-semibold text-primary">
                                                {msg.sender?.profile?.firstName?.[0]?.toUpperCase() || "?"}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-8 shrink-0" />
                                )}

                                {/* Message Body */}
                                <div className="flex-1 min-w-0">
                                    {/* Sender + Time */}
                                    {!grouped && (
                                        <div className="flex items-baseline gap-2 mb-0.5">
                                            <span className="text-sm font-semibold text-foreground">
                                                {senderName}
                                            </span>
                                            <span className="text-[10px] text-neutral-400">
                                                {format(new Date(msg.createdAt), "h:mm a")}
                                            </span>
                                        </div>
                                    )}

                                    {/* Content */}
                                    {msg.isDeleted ? (
                                        <p className="text-sm text-neutral-400 italic">
                                            This message was deleted
                                        </p>
                                    ) : editingMessageId === msg._id ? (
                                        <div className="flex gap-2">
                                            <input
                                                autoFocus
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleEditSubmit(msg._id);
                                                    if (e.key === "Escape") {
                                                        setEditingMessageId(null);
                                                        setEditContent("");
                                                    }
                                                }}
                                                className="flex-1 text-sm bg-white border border-neutral-200 rounded-md px-2.5 py-1.5"
                                            />
                                            <button
                                                onClick={() => handleEditSubmit(msg._id)}
                                                className="text-xs text-primary font-medium hover:underline"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingMessageId(null);
                                                    setEditContent("");
                                                }}
                                                className="text-xs text-neutral-400 hover:underline"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-foreground whitespace-pre-wrap wrap-break-word">
                                            {msg.content}
                                            {msg.isEdited && (
                                                <span className="text-[10px] text-neutral-400 ml-1">
                                                    (edited)
                                                </span>
                                            )}
                                        </p>
                                    )}

                                    {/* Attachments */}
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="mt-1.5 space-y-1">
                                            {msg.attachments.map((att, i) => (
                                                <a
                                                    key={i}
                                                    href={att.url || "#"}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    download
                                                    className="inline-flex items-center gap-2 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300 transition-colors rounded-md px-2.5 py-1.5 text-xs group cursor-pointer"
                                                >
                                                    {att.mimeType?.startsWith("image/") ? (
                                                        <FileText className="w-3.5 h-3.5 text-neutral-400 group-hover:text-primary transition-colors" />
                                                    ) : (
                                                        <Paperclip className="w-3.5 h-3.5 text-neutral-400 group-hover:text-primary transition-colors" />
                                                    )}
                                                    <span className="text-foreground truncate max-w-[200px] group-hover:text-primary transition-colors">
                                                        {att.name}
                                                    </span>
                                                    <span className="text-neutral-400">
                                                        {(att.size / 1024).toFixed(0)}KB
                                                    </span>
                                                    <Download className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all ml-1" />
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {/* Reactions */}
                                    {msg.reactions && msg.reactions.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {msg.reactions.map((r, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => onReaction(msg._id, r.emoji)}
                                                    className={cn(
                                                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border",
                                                        r.users.includes(currentUserId)
                                                            ? "bg-primary/10 border-primary/30 text-primary"
                                                            : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                                                    )}
                                                >
                                                    <span>{r.emoji}</span>
                                                    <span>{r.users.length}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Thread indicator */}
                                    {msg.replyCount > 0 && (
                                        <button
                                            onClick={() => onReply(msg)}
                                            className="mt-1 text-xs text-primary hover:underline flex items-center gap-1"
                                        >
                                            <MessageSquare className="w-3 h-3" />
                                            {msg.replyCount}{" "}
                                            {msg.replyCount === 1 ? "reply" : "replies"}
                                        </button>
                                    )}
                                </div>

                                {/* Hover Actions */}
                                {hoveredMessageId === msg._id && !msg.isDeleted && (
                                    <div className="absolute top-0 right-2 flex items-center gap-0.5 bg-white border border-neutral-200 rounded-md shadow-sm px-0.5 py-0.5">
                                        <button
                                            onClick={() => setReactionPickerFor(msg._id)}
                                            className="p-1.5 hover:bg-neutral-100 rounded transition-colors"
                                            title="React"
                                        >
                                            <SmilePlus className="w-3.5 h-3.5 text-neutral-500" />
                                        </button>
                                        <button
                                            onClick={() => onReply(msg)}
                                            className="p-1.5 hover:bg-neutral-100 rounded transition-colors"
                                            title="Reply in thread"
                                        >
                                            <MessageSquare className="w-3.5 h-3.5 text-neutral-500" />
                                        </button>
                                        {isOwn && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setEditingMessageId(msg._id);
                                                        setEditContent(msg.content);
                                                    }}
                                                    className="p-1.5 hover:bg-neutral-100 rounded transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil className="w-3.5 h-3.5 text-neutral-500" />
                                                </button>
                                                <button
                                                    onClick={() => onDelete(msg._id)}
                                                    className="p-1.5 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Reaction Picker Popover */}
                                {reactionPickerFor === msg._id && (
                                    <div className="absolute top-8 right-2 z-20">
                                        <ReactionPicker
                                            onSelect={(emoji) => {
                                                onReaction(msg._id, emoji);
                                                setReactionPickerFor(null);
                                            }}
                                            onClose={() => setReactionPickerFor(null)}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>
    );
}
