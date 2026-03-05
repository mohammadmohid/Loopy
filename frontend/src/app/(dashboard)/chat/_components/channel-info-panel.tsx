"use client";

import { useState } from "react";
import { apiRequest } from "@/lib/api";
import type { Channel, ChannelMember } from "@/lib/types";
import { X, UserPlus, LogOut, Settings, Loader2, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChannelInfoPanelProps {
    channel: Channel;
    currentUserId: string;
    onClose: () => void;
    onUpdated: () => void;
}

export function ChannelInfoPanel({
    channel,
    currentUserId,
    onClose,
    onUpdated,
}: ChannelInfoPanelProps) {
    const [editName, setEditName] = useState(false);
    const [name, setName] = useState(channel.name);
    const [description, setDescription] = useState(channel.description || "");
    const [saving, setSaving] = useState(false);

    const currentMember = channel.members.find(
        (m) => m.user._id === currentUserId
    );
    const isAdmin = currentMember?.role === "admin";

    const handleSave = async () => {
        try {
            setSaving(true);
            await apiRequest(`/chat/channels/${channel._id}`, {
                method: "PATCH",
                data: { name, description },
            });
            onUpdated();
            setEditName(false);
        } catch (err) {
            console.error("Failed to update channel:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleLeave = async () => {
        try {
            await apiRequest(
                `/chat/channels/${channel._id}/members/${currentUserId}`,
                { method: "DELETE" }
            );
            onUpdated();
            onClose();
        } catch (err) {
            console.error("Failed to leave channel:", err);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        try {
            await apiRequest(`/chat/channels/${channel._id}/members/${userId}`, {
                method: "DELETE",
            });
            onUpdated();
        } catch (err) {
            console.error("Failed to remove member:", err);
        }
    };

    return (
        <div className="w-80 border-l border-neutral-200 flex flex-col bg-white shrink-0">
            {/* Header */}
            <div className="h-14 border-b border-neutral-200 px-4 flex items-center justify-between shrink-0">
                <h4 className="font-semibold text-foreground text-sm">
                    Channel Details
                </h4>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-neutral-100 rounded transition-colors"
                >
                    <X className="w-4 h-4 text-neutral-500" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Channel Info */}
                <div className="p-4 border-b border-neutral-100 space-y-3">
                    {editName && isAdmin ? (
                        <div className="space-y-2">
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full text-sm border border-neutral-200 rounded-md px-2.5 py-1.5"
                                placeholder="Channel name"
                            />
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full text-sm border border-neutral-200 rounded-md px-2.5 py-1.5 resize-none"
                                rows={2}
                                placeholder="Description"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="text-xs bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary-dark transition-colors"
                                >
                                    {saving ? "Saving..." : "Save"}
                                </button>
                                <button
                                    onClick={() => {
                                        setEditName(false);
                                        setName(channel.name);
                                        setDescription(channel.description || "");
                                    }}
                                    className="text-xs text-neutral-500 hover:text-foreground px-3 py-1.5"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-neutral-300 text-lg">#</span>
                                <h3 className="font-semibold text-foreground">
                                    {channel.name}
                                </h3>
                                {isAdmin && (
                                    <button
                                        onClick={() => setEditName(true)}
                                        className="p-1 hover:bg-neutral-100 rounded transition-colors ml-auto"
                                    >
                                        <Settings className="w-3.5 h-3.5 text-neutral-400" />
                                    </button>
                                )}
                            </div>
                            {channel.description && (
                                <p className="text-sm text-neutral-500 mt-1">
                                    {channel.description}
                                </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400">
                                <span className="capitalize">{channel.type} channel</span>
                                <span>·</span>
                                <span>{channel.members.length} members</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Members */}
                <div className="p-4">
                    <h5 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                        Members ({channel.members.length})
                    </h5>
                    <div className="space-y-1">
                        {channel.members.map((member) => (
                            <div
                                key={member.user._id}
                                className="flex items-center gap-2.5 py-2 px-2 rounded-lg hover:bg-neutral-50 group"
                            >
                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-[10px] font-semibold text-primary">
                                        {member.user.profile?.firstName?.[0]?.toUpperCase() || "?"}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-medium text-foreground truncate">
                                            {member.user.profile?.firstName}{" "}
                                            {member.user.profile?.lastName}
                                        </span>
                                        {member.role === "admin" && (
                                            <Crown className="w-3 h-3 text-amber-500" />
                                        )}
                                        {member.user._id === currentUserId && (
                                            <span className="text-[10px] text-neutral-400">you</span>
                                        )}
                                    </div>
                                </div>
                                {isAdmin && member.user._id !== currentUserId && (
                                    <button
                                        onClick={() => handleRemoveMember(member.user._id)}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all text-red-400"
                                        title="Remove member"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Leave Channel */}
            <div className="border-t border-neutral-200 p-3">
                <button
                    onClick={handleLeave}
                    className="w-full flex items-center justify-center gap-1.5 text-sm text-red-500 hover:bg-red-50 py-2 rounded-lg transition-colors"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Leave Channel
                </button>
            </div>
        </div>
    );
}
