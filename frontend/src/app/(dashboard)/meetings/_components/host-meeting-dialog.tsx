"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Video, X, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";

interface Project {
  _id: string;
  name: string;
}

interface HostMeetingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HostMeetingDialog({ isOpen, onClose }: HostMeetingDialogProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // Form State
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [participants, setParticipants] = useState(""); // Comma separated emails
  const [isCreating, setIsCreating] = useState(false);

  // Fetch projects when dialog opens
  useEffect(() => {
    if (isOpen) {
      const fetchProjects = async () => {
        try {
          setLoadingProjects(true);
          const res = await apiRequest<Project[]>("/projects");
          setProjects(res);
          if (res.length > 0) setSelectedProjectId(res[0]._id);
        } catch (error) {
          console.error("Failed to load projects", error);
        } finally {
          setLoadingProjects(false);
        }
      };
      fetchProjects();
      
      // Reset form
      setTitle("");
      setParticipants("");
    }
  }, [isOpen]);

  const handleStartMeeting = async () => {
    if (!selectedProjectId || !title) return;

    try {
      setIsCreating(true);
      
      // 1. Call your Node.js Meeting Service
      const response = await apiRequest<{ meetingUrl: string }>(
        "/meetings", // This routes via Gateway -> Meeting Service
        {
          method: "POST",
          data: {
            projectId: selectedProjectId,
            title: title,
            // We can send participants if backend supports it, otherwise it's ignored for now
            participants: participants.split(",").map(p => p.trim()) 
          },
        }
      );

      // 2. Redirect to the Live Meeting Page
      // Append projectId so the upload dialog knows where to save the recording later
      router.push(`${response.meetingUrl}?projectId=${selectedProjectId}`);
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
            {loadingProjects ? (
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

          {/* Participants (Optional) */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700 flex items-center justify-between">
              <span>Participants</span>
              <span className="text-xs font-normal text-neutral-400">Optional</span>
            </label>
            <div className="relative">
              <Users className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Enter emails separated by commas"
                className="w-full pl-9 p-2.5 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
              />
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
            disabled={isCreating || !title || !selectedProjectId}
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