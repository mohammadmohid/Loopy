"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { ChannelMember } from "@/lib/types";
import { apiRequest } from "@/lib/api";
import { Send, Paperclip, AtSign, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
    channelId: string;
    members: ChannelMember[];
    onSend: (
        content: string,
        attachments?: { name: string; key: string; size: number; mimeType: string }[]
    ) => Promise<void>;
    onTyping: () => void;
    onStopTyping: () => void;
}

export function MessageInput({
    channelId,
    members,
    onSend,
    onTyping,
    onStopTyping,
}: MessageInputProps) {
    const [content, setContent] = useState("");
    const [sending, setSending] = useState(false);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionQuery, setMentionQuery] = useState("");
    const [uploading, setUploading] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState<
        { name: string; key: string; size: number; mimeType: string }[]
    >([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height =
                Math.min(textareaRef.current.scrollHeight, 120) + "px";
        }
    }, [content]);

    const handleTyping = useCallback(() => {
        onTyping();
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            onStopTyping();
        }, 2000);
    }, [onTyping, onStopTyping]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setContent(val);
        handleTyping();

        // Detect @mention trigger
        const lastAt = val.lastIndexOf("@");
        if (lastAt !== -1) {
            const afterAt = val.slice(lastAt + 1);
            if (!afterAt.includes(" ") && afterAt.length < 30) {
                setShowMentions(true);
                setMentionQuery(afterAt.toLowerCase());
                return;
            }
        }
        setShowMentions(false);
    };

    const handleMentionSelect = (member: ChannelMember) => {
        const lastAt = content.lastIndexOf("@");
        const before = content.slice(0, lastAt);
        const name = `${member.user.profile.firstName} ${member.user.profile.lastName}`;
        setContent(`${before}@${name} `);
        setShowMentions(false);
        textareaRef.current?.focus();
    };

    const handleSend = async () => {
        const trimmed = content.trim();
        if (!trimmed && pendingAttachments.length === 0) return;
        try {
            setSending(true);
            await onSend(
                trimmed,
                pendingAttachments.length > 0 ? pendingAttachments : undefined
            );
            setContent("");
            setPendingAttachments([]);
        } finally {
            setSending(false);
            onStopTyping();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            // Get presigned URL
            const { url, key } = await apiRequest<{ url: string; key: string }>(
                "/chat/upload/sign",
                {
                    method: "POST",
                    data: {
                        fileName: file.name,
                        fileType: file.type,
                        fileSize: file.size,
                    },
                }
            );

            // Upload to R2
            await fetch(url, {
                method: "PUT",
                body: file,
                headers: { "Content-Type": file.type },
            });

            setPendingAttachments((prev) => [
                ...prev,
                {
                    name: file.name,
                    key,
                    size: file.size,
                    mimeType: file.type,
                },
            ]);
        } catch (err) {
            console.error("Upload failed:", err);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const filteredMembers = members.filter((m) => {
        const name =
            `${m.user.profile.firstName} ${m.user.profile.lastName}`.toLowerCase();
        return name.includes(mentionQuery);
    });

    return (
        <div className="border-t border-neutral-200 p-3 relative">
            {/* Mention Autocomplete */}
            {showMentions && filteredMembers.length > 0 && (
                <div className="absolute bottom-full left-3 right-3 mb-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-20">
                    {filteredMembers.map((m) => (
                        <button
                            key={m.user._id}
                            onClick={() => handleMentionSelect(m)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 transition-colors text-left"
                        >
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-semibold text-primary">
                                    {m.user.profile.firstName?.[0]?.toUpperCase()}
                                </span>
                            </div>
                            <span className="text-foreground">
                                {m.user.profile.firstName} {m.user.profile.lastName}
                            </span>
                            <span className="text-neutral-400 text-xs ml-auto">
                                {m.user.email}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Pending Attachments */}
            {pendingAttachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {pendingAttachments.map((att, i) => (
                        <div
                            key={i}
                            className="inline-flex items-center gap-1.5 bg-neutral-50 border border-neutral-200 rounded-md px-2 py-1 text-xs"
                        >
                            <Paperclip className="w-3 h-3 text-neutral-400" />
                            <span className="truncate max-w-[120px]">{att.name}</span>
                            <button
                                onClick={() =>
                                    setPendingAttachments((prev) => prev.filter((_, j) => j !== i))
                                }
                                className="text-neutral-400 hover:text-red-400"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Input Bar */}
            <div className="flex items-end gap-2 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-1.5 hover:bg-neutral-200 rounded transition-colors text-neutral-500 shrink-0 mb-0.5"
                    title="Upload file"
                >
                    {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Paperclip className="w-4 h-4" />
                    )}
                </button>

                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-foreground resize-none outline-none border-none py-1 max-h-[120px] placeholder:text-neutral-400"
                    style={{ minHeight: "24px" }}
                />

                <button
                    onClick={handleSend}
                    disabled={
                        sending || (!content.trim() && pendingAttachments.length === 0)
                    }
                    className={cn(
                        "p-2 rounded-lg transition-colors shrink-0 mb-0.5",
                        content.trim() || pendingAttachments.length > 0
                            ? "bg-primary text-white hover:bg-primary-dark"
                            : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                    )}
                >
                    {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Send className="w-4 h-4" />
                    )}
                </button>
            </div>
        </div>
    );
}
