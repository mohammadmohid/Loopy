"use client";

import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api";
import type { Channel } from "@/lib/types";
import { X, Loader2, Search, Users, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-provider";
import Image from "next/image";

interface CreateChannelDialogProps {
    onClose: () => void;
    onCreated: (channel: Channel) => void;
}

interface Member {
    id: string;
    _id?: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
    role: string;
}

interface Team {
    _id: string;
    id?: string;
    name: string;
    members: Member[];
}

export function CreateChannelDialog({
    onClose,
    onCreated,
}: CreateChannelDialogProps) {
    const { user } = useAuth();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [restrictedChat, setRestrictedChat] = useState(false);
    const [creating, setCreating] = useState(false);

    // Assignment state
    const [availableMembers, setAvailableMembers] = useState<Member[]>([]);
    const [availableTeams, setAvailableTeams] = useState<Team[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
    const [isFetchingAssignments, setIsFetchingAssignments] = useState(false);

    // Dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    const looksLikeUrl = (s: string) => /^https?:\/\//.test(s) || s.startsWith("/");

    // Handle clicking outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch members and teams
    useEffect(() => {
        const fetchAssignments = async () => {
            setIsFetchingAssignments(true);
            try {
                const [membersData, teamsData] = await Promise.all([
                    apiRequest<{ members: Member[] }>("/auth/workspaces/members").catch(() => ({ members: [] })),
                    apiRequest<Team[]>("/projects/teams").catch(() => []),
                ]);
                setAvailableMembers(membersData.members);
                setAvailableTeams(teamsData);
            } catch (error) {
                console.error("Failed to load members and teams", error);
            } finally {
                setIsFetchingAssignments(false);
            }
        };

        fetchAssignments();
    }, []);

    const toggleMember = (memberId: string) => {
        if (user?.id && memberId === user.id) return;
        setSelectedMembers(prev => prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]);
    };

    const toggleTeam = (teamId: string) => {
        setSelectedTeams(prev => prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]);
    };

    const indirectlyAssignedMemberIds = new Set<string>();
    selectedTeams.forEach(teamId => {
        const team = availableTeams.find(t => t._id === teamId || t.id === teamId);
        if (team) {
            team.members.forEach(m => indirectlyAssignedMemberIds.add(m.id || m._id!));
        }
    });

    const handleCreate = async () => {
        if (!name.trim()) return;
        try {
            setCreating(true);
            
            // Collect all unique member IDs
            const allMemberIds = Array.from(new Set([...selectedMembers, ...Array.from(indirectlyAssignedMemberIds)]));

            const channel = await apiRequest<Channel>("/chat/channels", {
                method: "POST",
                data: {
                    name: name.trim(),
                    description: description.trim() || undefined,
                    type: "private", // Default type for custom channels
                    restrictedChat,
                    memberIds: allMemberIds,
                },
            });
            onCreated(channel);
        } catch (err) {
            console.error("Failed to create channel:", err);
        } finally {
            setCreating(false);
        }
    };

    const filteredTeams = availableTeams.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredMembers = availableMembers.filter(m => 
        (m.firstName + " " + m.lastName).toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 animate-fade-in flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 shrink-0">
                    <h3 className="font-semibold text-foreground">Create Channel</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-neutral-100 rounded transition-colors"
                    >
                        <X className="w-4 h-4 text-neutral-500" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-5 space-y-4 overflow-y-auto">
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

                    {/* Restricted Chat */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="restrictedChat"
                            checked={restrictedChat}
                            onChange={(e) => setRestrictedChat(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="restrictedChat" className="text-sm font-medium text-neutral-700">
                            Restrict messaging to Admins/PMs
                        </label>
                    </div>

                    {/* Members Assignment */}
                    <div className="space-y-2 relative" ref={dropdownRef}>
                        <label className="text-xs font-medium text-neutral-500 block">
                            Add Members
                        </label>
                        
                        <div 
                            className={cn(
                                "w-full px-4 py-2 text-sm cursor-text flex items-center justify-between border rounded-lg",
                                isDropdownOpen ? "border-primary ring-2 ring-primary/20 bg-white" : "border-neutral-200 bg-white"
                            )}
                            onClick={() => setIsDropdownOpen(true)}
                        >
                            <div className="flex-1 truncate">
                                {selectedTeams.length === 0 && selectedMembers.length === 0 ? (
                                    <span className="text-neutral-500">Search for members or teams...</span>
                                ) : (
                                    <span className="text-neutral-900 font-medium">
                                        {selectedTeams.length} Team{selectedTeams.length !== 1 && "s"}, {selectedMembers.length} Member{selectedMembers.length !== 1 && "s"} selected
                                    </span>
                                )}
                            </div>
                            {isFetchingAssignments && <span className="text-xs text-neutral-400">Loading...</span>}
                        </div>

                        {/* Dropdown UI */}
                        {isDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 overflow-hidden flex flex-col">
                                <div className="max-h-60 overflow-y-auto p-2">
                                    <div className="relative mb-2">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                                        <input 
                                            type="text" 
                                            autoFocus
                                            placeholder="Type to search..."
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-100 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-primary"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>

                                    {filteredTeams.length === 0 && filteredMembers.length === 0 && (
                                        <div className="text-center py-6 text-sm text-neutral-500">
                                            No matches found.
                                        </div>
                                    )}

                                    {filteredTeams.length > 0 && (
                                        <div className="mb-3">
                                            <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5" /> Teams
                                            </div>
                                            {filteredTeams.map(team => {
                                                const tId = team._id || team.id!;
                                                const isSelected = selectedTeams.includes(tId);
                                                return (
                                                    <div 
                                                        key={tId} 
                                                        onClick={() => toggleTeam(tId)}
                                                        className="flex items-center justify-between gap-3 px-2 py-2 hover:bg-neutral-50 rounded-lg cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors", isSelected ? "bg-primary border-primary text-white" : "border-neutral-300")}>
                                                                {isSelected && <Check className="w-3 h-3" />}
                                                            </div>
                                                            <span className="text-sm font-medium text-neutral-900">{team.name} <span className="text-xs text-neutral-400 font-normal">({team.members.length} members)</span></span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {filteredMembers.length > 0 && (
                                        <div>
                                            <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5" /> Individual Members
                                            </div>
                                            {filteredMembers.map(member => {
                                                const mId = member.id || member._id!;
                                                const isOwner = user?.id === mId;
                                                const isIndirectlyAssigned = !isOwner && indirectlyAssignedMemberIds.has(mId);
                                                const isSelected = isOwner || isIndirectlyAssigned || selectedMembers.includes(mId);
                                                const isDisabled = isOwner || isIndirectlyAssigned;
                                                return (
                                                    <div 
                                                        key={mId} 
                                                        onClick={() => {
                                                            if (!isDisabled) toggleMember(mId);
                                                        }}
                                                        className={cn(
                                                            "flex items-center justify-between gap-3 px-2 py-2 rounded-lg cursor-pointer",
                                                            isDisabled ? "opacity-60 cursor-not-allowed" : "hover:bg-neutral-50"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors", 
                                                                isSelected ? "bg-primary border-primary text-white" : "border-neutral-300",
                                                                isDisabled ? "opacity-50" : ""
                                                            )}>
                                                                {isSelected && <Check className="w-3 h-3" />}
                                                            </div>
                                                            <div className="w-6 h-6 rounded-full bg-neutral-200 border border-white flex items-center justify-center text-[10px] text-neutral-600 font-medium overflow-hidden shrink-0">
                                                                {member.avatarUrl && looksLikeUrl(member.avatarUrl) ? (
                                                                    <Image
                                                                        src={member.avatarUrl}
                                                                        alt={`${member.firstName} ${member.lastName}`}
                                                                        width={24}
                                                                        height={24}
                                                                        className="object-cover w-full h-full"
                                                                    />
                                                                ) : (
                                                                    <span>{(member.firstName?.[0] || "") + (member.lastName?.[0] || "")}</span>
                                                                )}
                                                            </div>
                                                            <span className="text-sm text-neutral-900">{member.firstName} {member.lastName}</span>
                                                        </div>
                                                        {isOwner ? (
                                                            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-md shrink-0">You</span>
                                                        ) : isIndirectlyAssigned ? (
                                                            <span className="text-xs text-neutral-500 italic bg-neutral-100 px-2 py-0.5 rounded-md shrink-0">via team</span>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-neutral-200 flex justify-end gap-2 shrink-0">
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
                            "Create"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
