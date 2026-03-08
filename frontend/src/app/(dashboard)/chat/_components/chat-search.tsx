"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";
import { X, Search as SearchIcon, Loader2, User as UserIcon } from "lucide-react";
import { format } from "date-fns";

interface SearchableUser {
    _id: string;
    email: string;
    profile: {
        firstName: string;
        lastName: string;
    };
}

interface ChatSearchProps {
    onClose: () => void;
    onNavigateToMessage: (channelId: string, messageId: string) => void;
}

export function ChatSearch({ onClose, onNavigateToMessage }: ChatSearchProps) {
    const [query, setQuery] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedUserId, setSelectedUserId] = useState("");
    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState<SearchableUser[]>([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    
    const [results, setResults] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    // Search users for filter
    useEffect(() => {
        if (!userSearch.trim()) {
            setUserResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                setSearchingUsers(true);
                const results = await apiRequest<SearchableUser[]>(
                    `/auth/users/search?q=${encodeURIComponent(userSearch.trim())}`
                );
                setUserResults(results);
            } catch {
                setUserResults([]);
            } finally {
                setSearchingUsers(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [userSearch]);

    const handleSearch = async () => {
        if (!query.trim() && !startDate && !endDate && !selectedUserId) return;
        try {
            setLoading(true);
            setSearched(true);
            
            let url = `/chat/search?`;
            const params = new URLSearchParams();
            if (query.trim()) params.append("q", query.trim());
            if (startDate) params.append("startDate", startDate);
            if (endDate) params.append("endDate", endDate);
            if (selectedUserId) params.append("userId", selectedUserId);
            
            const data = await apiRequest<{results: ChatMessage[], total: number}>(
                url + params.toString()
            );
            // The backend returns { results, total } usually, let's check.
            // Oh wait, in messageController.ts we updated it to return { results, total }.
            // The frontend originally expected an array. Let's map it safely.
            const resultsData = Array.isArray(data) ? data : data.results || [];
            
            setResults(resultsData);
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
                        placeholder="Search by keyword..."
                        className="flex-1 text-sm outline-none border-none bg-transparent placeholder:text-neutral-400"
                    />
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="text-xs text-primary font-medium hover:underline px-2"
                    >
                        {showFilters ? "Hide Filters" : "Filters"}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-neutral-100 rounded transition-colors"
                    >
                        <X className="w-4 h-4 text-neutral-500" />
                    </button>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex flex-col gap-4">
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-medium text-neutral-500 mb-1 block">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full text-sm border border-neutral-200 rounded-md px-2.5 py-1.5"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs font-medium text-neutral-500 mb-1 block">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full text-sm border border-neutral-200 rounded-md px-2.5 py-1.5"
                                />
                            </div>
                            <div className="flex-1 relative">
                                <label className="text-xs font-medium text-neutral-500 mb-1 block">
                                    From User
                                </label>
                                {selectedUserId ? (
                                    <div className="flex items-center justify-between w-full text-sm border border-neutral-200 rounded-md px-2.5 py-1.5 bg-white">
                                        <span className="truncate">{userSearch || "Selected"}</span>
                                        <button
                                            onClick={() => {
                                                setSelectedUserId("");
                                                setUserSearch("");
                                            }}
                                            className="text-neutral-400 hover:text-neutral-600"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <input
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        placeholder="Search user..."
                                        className="w-full text-sm border border-neutral-200 rounded-md px-2.5 py-1.5"
                                    />
                                )}
                                {/* User Results Dropdown */}
                                {!selectedUserId && userResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-md shadow-lg max-h-32 overflow-y-auto z-10">
                                        {userResults.map((u) => (
                                            <button
                                                key={u._id}
                                                onClick={() => {
                                                    setSelectedUserId(u._id);
                                                    setUserSearch(`${u.profile.firstName} ${u.profile.lastName}`);
                                                    setUserResults([]);
                                                }}
                                                className="w-full text-left px-3 py-2 hover:bg-neutral-50 transition-colors text-sm truncate"
                                            >
                                                {u.profile.firstName} {u.profile.lastName}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

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
