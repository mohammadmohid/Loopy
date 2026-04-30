"use client";

import { Hash, Lock, Users, Globe, MessageCircle, Loader2 } from "lucide-react";
import type { Channel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import { useAuth } from "@/lib/auth-provider";

interface ChannelListProps {
    channels: Channel[];
    selectedChannelId: string | null;
    onSelectChannel: (channel: Channel) => void;
    onCreateChannel?: () => void;
    loading: boolean;
    unreadCounts?: Record<string, number>;
}

export function ChannelList({
    channels,
    selectedChannelId,
    onSelectChannel,
    onCreateChannel,
    loading,
    unreadCounts,
}: ChannelListProps) {
    const { user } = useAuth();

    const globalChannels = channels.filter((c) => c.type === "global");
    const projectChannels = channels.filter((c) => c.type === "project");
    const teamChannels = channels.filter((c) => c.type === "team");
    const directChannels = channels.filter(
        (c) => c.type === "direct" || c.type === "private"
    );

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Create Channel Button */}
            {onCreateChannel && (
                <div className="p-3">
                    <button
                        onClick={onCreateChannel}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
                    >
                        + New Channel
                    </button>
                </div>
            )}

            {/* Global (Everyone) Channel — always first */}
            {globalChannels.length > 0 && (
                <div className="mb-1">
                    {globalChannels.map((channel) => {
                        const isActive = channel._id === selectedChannelId;
                        return (
                            <button
                                key={channel._id}
                                onClick={() => onSelectChannel(channel)}
                                className={cn(
                                    "w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors",
                                    isActive
                                        ? "bg-primary/8 border-r-2 border-primary"
                                        : "hover:bg-neutral-50"
                                )}
                            >
                                <Globe
                                    className={cn(
                                        "w-4 h-4 shrink-0",
                                        isActive ? "text-primary" : "text-blue-500"
                                    )}
                                />
                                <div className="min-w-0 flex-1 flex items-center justify-between">
                                    <span
                                        className={cn(
                                            "text-sm font-semibold truncate",
                                            isActive ? "text-primary" : "text-foreground"
                                        )}
                                    >
                                        {channel.name}
                                    </span>
                                    {unreadCounts?.[channel._id] ? (
                                        <span className="shrink-0 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center justify-center min-w-[20px] ml-2">
                                            {unreadCounts[channel._id] > 99 ? "99+" : unreadCounts[channel._id]}
                                        </span>
                                    ) : null}
                                </div>
                                {channel.lastMessageAt && (
                                    <span className="text-[10px] text-neutral-400 shrink-0">
                                        {formatDistanceToNow(new Date(channel.lastMessageAt), {
                                            addSuffix: false,
                                        })}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Project Channels */}
            {projectChannels.length > 0 && (
                <ChannelGroup
                    title="Projects"
                    channels={projectChannels}
                    selectedChannelId={selectedChannelId}
                    onSelectChannel={onSelectChannel}
                    icon="hash"
                    unreadCounts={unreadCounts}
                />
            )}

            {/* Members (DMs) */}
            {directChannels.length > 0 && (
                <DMGroup
                    title="Members"
                    channels={directChannels}
                    selectedChannelId={selectedChannelId}
                    onSelectChannel={onSelectChannel}
                    currentUserId={user?.id || ""}
                    unreadCounts={unreadCounts}
                />
            )}

            {/* Team Channels */}
            {teamChannels.length > 0 && (
                <ChannelGroup
                    title="Teams"
                    channels={teamChannels}
                    selectedChannelId={selectedChannelId}
                    onSelectChannel={onSelectChannel}
                    icon="users"
                    unreadCounts={unreadCounts}
                />
            )}

            {channels.length === 0 && (
                <div className="p-4 text-center text-sm text-neutral-400">
                    No channels yet. Create one or join a project.
                </div>
            )}
        </div>
    );
}

function ChannelGroup({
    title,
    channels,
    selectedChannelId,
    onSelectChannel,
    icon,
    unreadCounts,
}: {
    title: string;
    channels: Channel[];
    selectedChannelId: string | null;
    onSelectChannel: (channel: Channel) => void;
    icon?: "hash" | "users" | "lock";
    unreadCounts?: Record<string, number>;
}) {
    return (
        <div className="mb-2">
            <div className="px-4 py-2">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {title}
                </span>
            </div>
            {channels.map((channel) => {
                const isActive = channel._id === selectedChannelId;
                const ChannelIcon =
                    icon === "users"
                        ? Users
                        : icon === "lock"
                            ? Lock
                            : Hash;

                return (
                    <button
                        key={channel._id}
                        onClick={() => onSelectChannel(channel)}
                        className={cn(
                            "w-full flex items-start gap-2.5 px-4 py-2.5 text-left transition-colors",
                            isActive
                                ? "bg-primary/8 border-r-2 border-primary"
                                : "hover:bg-neutral-50"
                        )}
                    >
                        <ChannelIcon
                            className={cn(
                                "w-4 h-4 mt-0.5 shrink-0",
                                isActive ? "text-primary" : "text-neutral-400"
                            )}
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                                <span
                                    className={cn(
                                        "text-sm font-medium truncate",
                                        isActive ? "text-primary" : "text-foreground"
                                    )}
                                >
                                    {channel.name}
                                </span>
                                {channel.lastMessageAt && (
                                    <span className="text-[10px] text-neutral-400 shrink-0 ml-2">
                                        {formatDistanceToNow(new Date(channel.lastMessageAt), {
                                            addSuffix: false,
                                        })}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                                {channel.lastMessagePreview ? (
                                    <p className="text-xs text-neutral-400 truncate pr-2">
                                        {channel.lastMessagePreview}
                                    </p>
                                ) : <div />}
                                {unreadCounts?.[channel._id] ? (
                                    <span className="shrink-0 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center justify-center min-w-[20px]">
                                        {unreadCounts[channel._id] > 99 ? "99+" : unreadCounts[channel._id]}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

function DMGroup({
    title,
    channels,
    selectedChannelId,
    onSelectChannel,
    currentUserId,
    unreadCounts,
}: {
    title: string;
    channels: Channel[];
    selectedChannelId: string | null;
    onSelectChannel: (channel: Channel) => void;
    currentUserId: string;
    unreadCounts?: Record<string, number>;
}) {
    const looksLikeUrl = (s: string) => /^https?:\/\//.test(s) || s.startsWith("/");

    return (
        <div className="mb-2">
            <div className="px-4 py-2">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    {title}
                </span>
            </div>
            {channels.map((channel) => {
                const isActive = channel._id === selectedChannelId;

                // For DMs, show the other member's info
                const otherMember = channel.members.find(
                    (m) => (m.user as any)?._id !== currentUserId && (m.user as any)?.toString?.() !== currentUserId
                );
                const memberUser = otherMember?.user as any;
                const displayName = memberUser?.profile
                    ? `${memberUser.profile.firstName} ${memberUser.profile.lastName}`
                    : channel.name;
                const avatarUrl = memberUser?.profile?.avatarUrl || memberUser?.profile?.avatarKey;
                const initials = memberUser?.profile
                    ? `${memberUser.profile.firstName?.[0] || ""}${memberUser.profile.lastName?.[0] || ""}`
                    : "?";

                return (
                    <button
                        key={channel._id}
                        onClick={() => onSelectChannel(channel)}
                        className={cn(
                            "w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors",
                            isActive
                                ? "bg-primary/8 border-r-2 border-primary"
                                : "hover:bg-neutral-50"
                        )}
                    >
                        {/* Avatar */}
                        <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center shrink-0 overflow-hidden relative">
                            {avatarUrl && looksLikeUrl(avatarUrl) ? (
                                <Image
                                    src={avatarUrl}
                                    alt={displayName}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <span className="text-[10px] font-medium text-neutral-600">
                                    {initials}
                                </span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                                <span
                                    className={cn(
                                        "text-sm font-medium truncate",
                                        isActive ? "text-primary" : "text-foreground"
                                    )}
                                >
                                    {displayName}
                                </span>
                                {channel.lastMessageAt && (
                                    <span className="text-[10px] text-neutral-400 shrink-0 ml-2">
                                        {formatDistanceToNow(new Date(channel.lastMessageAt), {
                                            addSuffix: false,
                                        })}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between mt-0.5">
                                {channel.lastMessagePreview ? (
                                    <p className="text-xs text-neutral-400 truncate pr-2">
                                        {channel.lastMessagePreview}
                                    </p>
                                ) : <div />}
                                {unreadCounts?.[channel._id] ? (
                                    <span className="shrink-0 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-flex items-center justify-center min-w-[20px]">
                                        {unreadCounts[channel._id] > 99 ? "99+" : unreadCounts[channel._id]}
                                    </span>
                                ) : null}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
