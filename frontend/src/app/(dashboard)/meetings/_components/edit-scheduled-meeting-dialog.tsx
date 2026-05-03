"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Users, Check, ChevronsUpDown } from "lucide-react";
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
import { format } from "date-fns";
import type { Meeting } from "./meeting-history-list";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface EditScheduledMeetingDialogProps {
  meeting: Meeting | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function EditScheduledMeetingDialog({
  meeting,
  isOpen,
  onClose,
  onSaved,
}: EditScheduledMeetingDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen || !meeting) return;

    const load = async () => {
      try {
        setLoadingData(true);
        const usersRes = await apiRequest<User[]>("/auth/users");
        setUsers(usersRes);
      } catch (error) {
        console.error("Failed to load users", error);
      } finally {
        setLoadingData(false);
      }
    };
    load();

    setTitle(meeting.title ?? "");
    const whenSrc = meeting.scheduledAt || meeting.createdAt;
    const when = whenSrc ? new Date(whenSrc) : new Date();
    setDate(Number.isNaN(when.getTime()) ? "" : format(when, "yyyy-MM-dd"));
    setTime(Number.isNaN(when.getTime()) ? "" : format(when, "HH:mm"));
    const rawParts = Array.isArray(meeting.participants) ? meeting.participants : [];
    setSelectedUsers(rawParts.map((p) => String(p)));
    setIsDropdownOpen(false);
  }, [isOpen, meeting]);

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSave = async () => {
    if (!meeting || !title.trim() || !date || !time) return;

    try {
      setIsSaving(true);
      const dateTimeString = `${date}T${time}:00`;
      const scheduledAt = new Date(dateTimeString).toISOString();

      await apiRequest(`/meetings/${meeting._id}`, {
        method: "PATCH",
        data: {
          title: title.trim(),
          scheduledAt,
          participants: selectedUsers,
        },
      });

      onClose();
      onSaved?.();
      window.dispatchEvent(new Event("meetingsUpdated"));
    } catch (error) {
      console.error("Failed to update meeting:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !meeting) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-xl animate-in zoom-in-95">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-neutral-900">Edit upcoming meeting</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">Meeting title</label>
            <input
              type="text"
              className="w-full p-2.5 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">Date &amp; time</label>
            <div className="flex gap-4">
              <input
                type="date"
                className="w-full flex-1 pl-3 pr-3 py-2.5 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-neutral-600 bg-white"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <input
                type="time"
                className="w-full flex-1 pl-3 pr-3 py-2.5 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 text-neutral-600 bg-white font-mono"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5 z-50">
            <label className="text-sm font-medium text-neutral-700">Participants</label>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                className="w-full flex items-center justify-between p-2.5 border border-neutral-200 rounded-lg bg-white cursor-pointer hover:border-neutral-300 transition-colors text-left"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-neutral-400" />
                  <span
                    className={
                      selectedUsers.length ? "text-neutral-900 text-sm" : "text-neutral-400 text-sm"
                    }
                  >
                    {selectedUsers.length > 0
                      ? `${selectedUsers.length} user${selectedUsers.length > 1 ? "s" : ""} selected`
                      : "Search and select users..."}
                  </span>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-neutral-400 shrink-0" />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  <Command>
                    <CommandInput
                      placeholder="Search users by name or email..."
                      className="border-none focus:ring-0"
                    />
                    <CommandList className="max-h-[200px] overflow-y-auto p-1">
                      <CommandEmpty className="py-6 text-center text-sm text-neutral-500">
                        {loadingData ? "Loading users..." : "No users found."}
                      </CommandEmpty>
                      <CommandGroup>
                        {users.map((user) => {
                          const isSelected = selectedUsers.includes(user.id);
                          return (
                            <CommandItem
                              key={user.id}
                              value={`${user.firstName} ${user.lastName} ${user.email}`}
                              onSelect={() => toggleUser(user.id)}
                              className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md hover:bg-neutral-50 aria-selected:bg-neutral-50"
                            >
                              <div
                                className={cn(
                                  "flex items-center justify-center w-4 h-4 rounded border",
                                  isSelected
                                    ? "bg-primary border-primary text-white"
                                    : "border-neutral-300"
                                )}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-neutral-900">
                                  {user.firstName} {user.lastName}
                                </span>
                                <span className="text-xs text-neutral-500">{user.email}</span>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !title.trim() || !date || !time}
            className="bg-primary text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
