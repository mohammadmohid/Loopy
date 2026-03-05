"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import { X, Search as SearchIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface ChatSearchProps {
    onClose: () => void;
    onNavigateToMessage: (channelId: string, messageId: string) => void;
}

export function ChatSearch({ onClose, onNavigateToMessage }: ChatSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async () => {
        if (!query.trim()) return;
        try {
            setLoading(true);
            setSearched(true);
            const data = await apiRequest<ChatMessage[]>(
                `/chat/search?q=${encodeURIComponent(query.trim())}`
            );
            setResults(data);
        } catch (err) {
            console.error("Search failed:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-24">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[70vh] flex flex-col overflow-hidden animate-fade-in">
                {/* Search Input */}
                <div className="p-4 border-b border-neutral-200 flex items-center gap-3">
                    <SearchIcon className="w-4 h-4 text-neutral-400 shrink-0" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSearch();
                            if (e.key === "Escape") onClose();
                        }}
                        placeholder="Search messages..."
                        className="flex-1 text-sm outline-none border-none bg-transparent placeholder:text-neutral-400"
                    />
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-neutral-100 rounded transition-colors"
                    >
                        <X className="w-4 h-4 text-neutral-500" />
                    </button>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-neutral-300" />
                        </div>
                    ) : results.length > 0 ? (
                        <div className="divide-y divide-neutral-100">
                            {results.map((msg) => {
                                const name = msg.sender?.profile
                                    ? `${msg.sender.profile.firstName} ${msg.sender.profile.lastName}`
                                    : "Unknown";
                                return (
                                    <button
                                        key={msg._id}
                                        onClick={() =>
                                            onNavigateToMessage(msg.channelId, msg._id)
                                        }
                                        className="w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors"
                                    >
                                        <div className="flex items-baseline gap-2 mb-0.5">
                                            <span className="text-sm font-medium text-foreground">
                                                {name}
                                            </span>
                                            <span className="text-[10px] text-neutral-400">
                                                {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                                            </span>
                                        </div>
                                        <p className="text-sm text-neutral-600 truncate">
                                            {msg.content}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    ) : searched ? (
                        <div className="py-8 text-center text-sm text-neutral-400">
                            No messages found for &ldquo;{query}&rdquo;
                        </div>
                    ) : (
                        <div className="py-8 text-center text-sm text-neutral-400">
                            Type a keyword and press Enter to search
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
