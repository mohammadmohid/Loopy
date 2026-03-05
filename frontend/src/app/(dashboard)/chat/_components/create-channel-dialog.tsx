"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import type { Channel } from "@/lib/types";
import { X, Loader2, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-provider";

interface CreateChannelDialogProps {
    onClose: () => void;
    onCreated: (channel: Channel) => void;
}

interface SearchableUser {
    _id: string;
    email: string;
    profile: {
        firstName: string;
        lastName: string;
    };
}

export function CreateChannelDialog({
    onClose,
    onCreated,
}: CreateChannelDialogProps) {
    const { user } = useAuth();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<"team" | "private">("team");
    const [creating, setCreating] = useState(false);
    const [memberSearch, setMemberSearch] = useState("");
    const [searchResults, setSearchResults] = useState<SearchableUser[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<SearchableUser[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    // Search users
    useEffect(() => {
        if (!memberSearch.trim()) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                setSearchLoading(true);
                const results = await apiRequest<SearchableUser[]>(
                    `/auth/users/search?q=${encodeURIComponent(memberSearch.trim())}`
                );
                // Filter out already-selected and self
                setSearchResults(
                    results.filter(
                        (u) =>
                            u._id !== user?.id &&
                            !selectedMembers.find((s) => s._id === u._id)
                    )
                );
            } catch {
                setSearchResults([]);
            } finally {
                setSearchLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [memberSearch, selectedMembers, user?.id]);

    const handleCreate = async () => {
        if (!name.trim()) return;
        try {
            setCreating(true);
            const channel = await apiRequest<Channel>("/chat/channels", {
                method: "POST",
                data: {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    type,
                    memberIds: selectedMembers.map((m) => m._id),
                },
            });
            onCreated(channel);
        } catch (err) {
            console.error("Failed to create channel:", err);
        } finally {
            setCreating(false);
        }
    };

    const toggleMember = (user: SearchableUser) => {
        setSelectedMembers((prev) => {
            const exists = prev.find((m) => m._id === user._id);
            if (exists) return prev.filter((m) => m._id !== user._id);
            return [...prev, user];
        });
        setMemberSearch("");
        setSearchResults([]);
    };

    return (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
                    <h3 className="font-semibold text-foreground">Create Channel</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-neutral-100 rounded transition-colors"
                    >
                        <X className="w-4 h-4 text-neutral-500" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-5 space-y-4">
                    {/* Name */}
                    <div>
                        <label className="text-xs font-medium text-neutral-500 mb-1.5 block">
                            Channel Name
                        </label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. design-team"
                            className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-medium text-neutral-500 mb-1.5 block">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What is this channel about?"
                            rows={2}
                            className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2 resize-none"
                        />
                    </div>

                    {/* Channel Type */}
                    <div>
                        <label className="text-xs font-medium text-neutral-500 mb-1.5 block">
                            Type
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setType("team")}
                                className={cn(
                                    "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                                    type === "team"
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                                )}
                            >
                                Team
                            </button>
                            <button
                                onClick={() => setType("private")}
                                className={cn(
                                    "px-3 py-1.5 text-sm rounded-lg border transition-colors",
                                    type === "private"
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                                )}
                            >
                                Private
                            </button>
                        </div>
                    </div>

                    {/* Members */}
                    <div>
                        <label className="text-xs font-medium text-neutral-500 mb-1.5 block">
                            Add Members
                        </label>
                        {/* Selected Members */}
                        {selectedMembers.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {selectedMembers.map((m) => (
                                    <span
                                        key={m._id}
                                        className="inline-flex items-center gap-1 bg-primary/5 text-primary text-xs px-2 py-1 rounded-full"
                                    >
                                        {m.profile.firstName} {m.profile.lastName}
                                        <button
                                            onClick={() =>
                                                setSelectedMembers((prev) =>
                                                    prev.filter((s) => s._id !== m._id)
                                                )
                                            }
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                            <input
                                value={memberSearch}
                                onChange={(e) => setMemberSearch(e.target.value)}
                                placeholder="Search by name or email..."
                                className="w-full text-sm border border-neutral-200 rounded-lg pl-8 pr-3 py-2"
                            />
                        </div>
                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mt-1 border border-neutral-200 rounded-lg max-h-32 overflow-y-auto">
                                {searchResults.map((u) => (
                                    <button
                                        key={u._id}
                                        onClick={() => toggleMember(u)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-50 transition-colors text-left"
                                    >
                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-[8px] font-semibold text-primary">
                                                {u.profile.firstName[0]?.toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="text-foreground">
                                            {u.profile.firstName} {u.profile.lastName}
                                        </span>
                                        <span className="text-neutral-400 text-xs ml-auto">
                                            {u.email}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                        {searchLoading && (
                            <div className="flex justify-center py-2">
                                <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-neutral-200 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={creating || !name.trim()}
                        className={cn(
                            "px-4 py-2 text-sm rounded-lg transition-colors font-medium",
                            name.trim()
                                ? "bg-primary text-white hover:bg-primary-dark"
                                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                        )}
                    >
                        {creating ? (
                            <span className="flex items-center gap-1.5">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Creating...
                            </span>
                        ) : (
                            "Create Channel"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
