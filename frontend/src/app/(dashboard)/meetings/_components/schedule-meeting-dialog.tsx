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

interface ScheduleMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleComplete?: () => void;
}

export function ScheduleMeetingDialog({ isOpen, onClose, onScheduleComplete }: ScheduleMeetingDialogProps) {
  const router = useRouter();

  // Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Form State
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(""); // YYYY-MM-DD
  const [time, setTime] = useState(""); // HH:mm
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
          // Fetch both lists in parallel
          const [projectsRes, usersRes] = await Promise.all([
            apiRequest<Project[]>("/projects"),
            apiRequest<User[]>("/auth/users"),
          ]);

          setProjects(projectsRes);
          setUsers(usersRes);

          if (projectsRes.length > 0) setSelectedProjectId(projectsRes[0]._id);
        } catch (error) {
          console.error("Failed to load data", error);
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();

      // Reset form
      setTitle("");
      setDate("");
      setTime("");
    }
  }, [isOpen]);

  const handleStartMeeting = async () => {
    if (!selectedProjectId || !title || !date || !time) return;

    try {
      setIsCreating(true);

      // Combine Date and Time into an ISO timestamp string
      // E.g., Date: "2025-10-25", Time: "14:30" => "2025-10-25T14:30:00.000Z"
      const dateTimeString = `${date}T${time}:00`;
      const scheduledAt = new Date(dateTimeString).toISOString();

      // 1. Get current user profile (for hostName)
      const userRes = await apiRequest<{ user: { profile: { firstName: string; lastName: string } } }>("/auth/me");
      const hostName = `${userRes.user.profile.firstName} ${userRes.user.profile.lastName}`;

      const selectedProject = projects.find(p => p._id === selectedProjectId);
      const projectName = selectedProject ? selectedProject.name : "Unknown Project";

      // 2. Call Meeting Service
      await apiRequest<{ _id: string, roomName: string }>(
        "/meetings",
        {
          method: "POST",
          data: {
            projectId: selectedProjectId,
            projectName: projectName,
            title: title,
            scheduledAt, // Pass scheduled date to backend!
            participants: [], // No participants at scheduling time from this UI
            hostName: hostName,
          },
        }
      );

      // 3. Close & Refresh
      onClose();
      if (onScheduleComplete) {
        onScheduleComplete();
      }
    } catch (error) {
      console.error("Failed to schedule meeting:", error);
      alert("Failed to schedule meeting. Please try again.");
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
            Schedule New Meeting
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

          {/* Date and Time Pickers (Horizontally aligned) */}
          <div className="space-y-1.5 pt-2">
            <label className="text-sm font-medium text-neutral-700">When will meeting be scheduled?</label>
            <div className="flex gap-4">
              {/* Date Input */}
              <div className="relative flex-1">
                <input
                  type="date"
                  className="w-full pl-3 pr-3 py-2.5 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-neutral-600 appearance-none bg-white"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* Time Input */}
              <div className="relative flex-1">
                <input
                  type="time"
                  className="w-full pl-3 pr-3 py-2.5 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-neutral-600 appearance-none bg-white font-mono"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleStartMeeting}
            disabled={isCreating || !title || !selectedProjectId || !date || !time}
            className="bg-primary text-white"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              "Schedule Meeting"
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}