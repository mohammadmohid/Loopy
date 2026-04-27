"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Video, X, Loader2, Users, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface Project {
  _id: string;
  name: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

/** Current user snapshot from /auth/me — host is always a participant and never listed as togglable. */
interface HostSelf {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface HostMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HostMeetingDialog({ isOpen, onClose }: HostMeetingDialogProps) {
  const router = useRouter();

  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form State
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]); // User IDs (always includes host)
  const [hostSelf, setHostSelf] = useState<HostSelf | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch projects AND users when dialog opens
  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          setLoadingData(true);
          setHostSelf(null);
          const [projectsRes, usersRes, meRes] = await Promise.all([
            apiRequest<Project[]>("/projects"),
            apiRequest<User[]>("/auth/users"),
            apiRequest<{
              user: {
                id: string;
                email: string;
                profile: { firstName: string; lastName: string };
              };
            }>("/auth/me"),
          ]);

          setProjects(projectsRes);
          setUsers(usersRes);

          if (projectsRes.length > 0) setSelectedProjectId(projectsRes[0]._id);

          const u = meRes.user;
          const self: HostSelf = {
            id: String(u.id),
            email: u.email,
            firstName: u.profile.firstName,
            lastName: u.profile.lastName,
          };
          setHostSelf(self);
          setSelectedParticipants([self.id]);
        } catch (error) {
          console.error("Failed to load data", error);
          setHostSelf(null);
          setSelectedParticipants([]);
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();

      // Reset form (participants re-filled after fetch with host only)
      setTitle("");
      setAgenda("");
    }
  }, [isOpen]);

  const toggleParticipant = (userId: string) => {
    if (hostSelf && String(userId) === hostSelf.id) return;
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleStartMeeting = async () => {
    if (!selectedProjectId || !title) return;

    try {
      setIsCreating(true);

      // Host display name (prefer dialog load; fallback if session changed)
      let hostName = hostSelf ? `${hostSelf.firstName} ${hostSelf.lastName}` : "";
      if (!hostName.trim()) {
        const userRes = await apiRequest<{ user: { profile: { firstName: string; lastName: string } } }>("/auth/me");
        hostName = `${userRes.user.profile.firstName} ${userRes.user.profile.lastName}`;
      }

      const selectedProject = projects.find(p => p._id === selectedProjectId);
      const projectName = selectedProject ? selectedProject.name : "Unknown Project";

      // 2. Call Meeting Service
      const response = await apiRequest<{ _id: string, roomName: string }>(
        "/meetings",
        {
          method: "POST",
          data: {
            projectId: selectedProjectId,
            projectName: projectName,
            title: title,
            agenda: agenda,
            // Send IDs directly (Backend now expects array of User IDs)
            participants: selectedParticipants,
            hostName: hostName,
          },
        }
      );

      // 3. Redirect
      router.push(`/meetings/live/${response.roomName}?projectId=${selectedProjectId}`);
      onClose();
    } catch (error) {
      console.error("Failed to start meeting:", error);
      alert("Failed to create meeting room. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-xl animate-in zoom-in-95">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Host New Meeting
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Project Selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">Project Context</label>
            {loadingData ? (
              <div className="h-10 w-full bg-neutral-100 animate-pulse rounded-lg" />
            ) : (
              <select
                className="w-full p-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary/20 outline-none"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Meeting Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">Meeting Title</label>
            <input
              type="text"
              placeholder="e.g. Weekly Sync, Design Review"
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Meeting Agenda */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">Meeting Agenda</label>
            <textarea
              placeholder="Write a brief agenda for this meeting..."
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none min-h-[84px]"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
            />
          </div>

          {/* Participants Dropdown */}
          <div className="space-y-1.5 relative" ref={dropdownRef}>
            <label className="text-sm font-medium text-neutral-700 flex items-center justify-between">
              <span>Participants</span>
              <span className="text-xs font-normal text-neutral-400">
                {hostSelf
                  ? (() => {
                      const others = selectedParticipants.filter((id) => id !== hostSelf.id).length;
                      return others === 0 ? "You (host)" : `You + ${others}`;
                    })()
                  : `${selectedParticipants.length} selected`}
              </span>
            </label>

            <div
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-sm bg-white focus-within:ring-2 focus-within:ring-primary/20 flex items-center justify-between cursor-pointer"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="flex items-center gap-2 text-neutral-500 overflow-hidden">
                <Users className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {!hostSelf
                    ? "Loading…"
                    : selectedParticipants.filter((id) => id !== hostSelf.id).length === 0
                      ? "You (host) — add invitees optional"
                      : `You + ${selectedParticipants.filter((id) => id !== hostSelf.id).length} invitee(s)`}
                </span>
              </div>
              <ChevronsUpDown className="w-4 h-4 text-neutral-400 shrink-0" />
            </div>

            {/* Dropdown Content */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 overflow-hidden">
                <Command>
                  <CommandInput placeholder="Search users..." />
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto">
                      {hostSelf && (
                        <div
                          className="flex items-center gap-2 px-2 py-2 text-sm border-b border-neutral-100 bg-neutral-50 cursor-default select-none"
                          aria-readonly
                        >
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary bg-primary text-primary-foreground">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="font-medium text-neutral-900">
                              {hostSelf.firstName} {hostSelf.lastName}{" "}
                              <span className="text-xs font-normal text-neutral-500">(you, host)</span>
                            </span>
                            <span className="truncate text-xs text-neutral-400">{hostSelf.email}</span>
                          </div>
                        </div>
                      )}
                      {users
                        .filter((user) => !hostSelf || String(user.id) !== hostSelf.id)
                        .map((user) => (
                        <CommandItem
                          key={user.id}
                          onSelect={() => toggleParticipant(user.id)}
                          className="cursor-pointer"
                        >
                          <div className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            selectedParticipants.includes(user.id)
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}>
                            <Check className={cn("h-4 w-4 text-white")} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.firstName} {user.lastName}</span>
                            <span className="text-xs text-neutral-400">{user.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleStartMeeting}
            disabled={isCreating || !title || !selectedProjectId || !hostSelf}
            className="bg-primary text-white"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Room...
              </>
            ) : (
              "Start Meeting"
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}