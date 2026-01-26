"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // 👈 1. Import Router
import { Users, X, Play, FileText, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export interface Meeting {
  _id: string;
  title: string;
  roomName: string;
  hostName: string;
  projectName: string;
  participants: string[];
  createdAt: string;
  status: "active" | "ended";
  endedAt?: string;
}

interface MeetingHistoryListProps {
  meetings: Meeting[];
}

export function MeetingHistoryList({ meetings }: MeetingHistoryListProps) {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const router = useRouter(); // 👈 2. Initialize Router

  if (meetings.length === 0) return null;

  return (
    <div className="space-y-4 mb-8">
      <h2 className="text-lg font-semibold text-neutral-900">Past Meetings</h2>
      
      <div className="space-y-3">
        {meetings.map((meeting) => (
          <div
            key={meeting._id}
            onClick={() => setSelectedMeeting(meeting)}
            className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-neutral-200 rounded-xl hover:border-primary/50 hover:shadow-sm cursor-pointer transition-all"
          >
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-neutral-900 group-hover:text-primary transition-colors">
                {meeting.title}
              </span>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span className="bg-neutral-100 px-2 py-0.5 rounded-full font-medium text-neutral-600">
                  {meeting.projectName}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(meeting.createdAt), "MMM d, yyyy")}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(meeting.createdAt), "h:mm a")}
                </span>
              </div>
            </div>
            
            <div className="mt-3 sm:mt-0 flex items-center gap-4 text-sm text-neutral-400">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {meeting.participants.length}
              </span>
              <span className="group-hover:translate-x-1 transition-transform text-primary font-medium">
                View Details →
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* --- Detail Dialog (Modal) --- */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} 
          >
            <button 
              onClick={() => setSelectedMeeting(null)}
              className="absolute top-4 right-4 p-2 hover:bg-neutral-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>

            {/* Modal Header */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-neutral-900">{selectedMeeting.title}</h2>
              <div className="flex items-center gap-2 text-sm text-neutral-500 mt-2">
                 <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">Ended</span>
                 <span>{format(new Date(selectedMeeting.createdAt), "PPP p")}</span>
              </div>
            </div>

            <div className="space-y-6">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Project</span>
                    <span className="font-medium text-sm text-neutral-900">{selectedMeeting.projectName}</span>
                </div>
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">Host</span>
                    <span className="font-medium text-sm text-neutral-900">{selectedMeeting.hostName}</span>
                </div>
              </div>

              {/* Participants Section */}
              <div>
                <h3 className="text-sm font-medium text-neutral-900 flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-neutral-500" /> 
                    Participants ({selectedMeeting.participants.length})
                </h3>
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100 text-sm text-neutral-600">
                    {selectedMeeting.participants.length > 0 
                        ? "Currently storing IDs only (Update backend to populate names if needed)" 
                        : "No other participants invited."}
                </div>
              </div>

              <div className="h-px bg-neutral-100 w-full" />

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                    variant="outline" 
                    className="gap-2 h-auto py-3 border-dashed border-neutral-300 text-neutral-600 hover:text-primary hover:border-primary hover:bg-primary/5"
                    onClick={() => {
                        // Optional: Also go to page or open video player
                        router.push(`/meetings/${selectedMeeting._id}`);
                    }}
                >
                    <Play className="w-4 h-4" />
                    <span>View Recording</span>
                </Button>

                {/* 👇 3. THE FIX: Link to the detailed page */}
                <Button 
                    variant="outline" 
                    className="gap-2 h-auto py-3 border-dashed border-neutral-300 text-neutral-600 hover:text-primary hover:border-primary hover:bg-primary/5"
                    onClick={() => {
                        router.push(`/meetings/${selectedMeeting._id}`);
                    }}
                >
                    <FileText className="w-4 h-4" />
                    <span>View Summary</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}