"use client";

import { Hash, Lock, Users, Plus, Loader2 } from "lucide-react";
import type { Channel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ChannelListProps {
    channels: Channel[];
    selectedChannelId: string | null;
    onSelectChannel: (channel: Channel) => void;
    onCreateChannel: () => void;
    loading: boolean;
}

export function ChannelList({
    channels,
    selectedChannelId,
    onSelectChannel,
    onCreateChannel,
    loading,
}: ChannelListProps) {
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
            <div className="p-3">
                <button
                    onClick={onCreateChannel}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    New Channel
                </button>
            </div>

            {/* Project Channels */}
            {projectChannels.length > 0 && (
                <ChannelGroup
                    title="Project Channels"
                    channels={projectChannels}
                    selectedChannelId={selectedChannelId}
                    onSelectChannel={onSelectChannel}
                />
            )}

            {/* Team Channels */}
            {teamChannels.length > 0 && (
                <ChannelGroup
                    title="Team Channels"
                    channels={teamChannels}
                    selectedChannelId={selectedChannelId}
                    onSelectChannel={onSelectChannel}
                />
            )}

            {/* Direct & Private */}
            {directChannels.length > 0 && (
                <ChannelGroup
                    title="Direct Messages"
                    channels={directChannels}
                    selectedChannelId={selectedChannelId}
                    onSelectChannel={onSelectChannel}
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
}: {
    title: string;
    channels: Channel[];
    selectedChannelId: string | null;
    onSelectChannel: (channel: Channel) => void;
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
                    channel.type === "private" || channel.type === "direct"
                        ? Lock
                        : channel.type === "team"
                            ? Users
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
                            {channel.lastMessagePreview && (
                                <p className="text-xs text-neutral-400 truncate mt-0.5">
                                    {channel.lastMessagePreview}
                                </p>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
