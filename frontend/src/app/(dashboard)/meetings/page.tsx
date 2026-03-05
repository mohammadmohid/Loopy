"use client";

import { useState, useEffect } from "react";
import { UploadCloud, Search, Video, Calendar, ChevronRight, Hash, Users, MessageSquare, Files, Activity, Settings, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadDialog } from "@/components/upload-dialog";
import { MeetingList, type Artifact } from "./_components/meeting-list";
import { HostMeetingDialog } from "./_components/host-meeting-dialog";
import { ScheduleMeetingDialog } from "./_components/schedule-meeting-dialog";
import { LiveMeetingList } from "./_components/live-meeting-list";
import { MeetingHistoryList, type Meeting } from "./_components/meeting-history-list";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function MeetingsPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isHostMeetingOpen, setIsHostMeetingOpen] = useState(false);
  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = useState(false);

  // Data State
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]); // Store ALL meetings here
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  // Local Sidebar State
  const [activeTab, setActiveTab] = useState("my-meetings");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch Artifacts and Meetings with individual catch to avoid total failure on 504
      const [artifactsRes, meetingsRes] = await Promise.allSettled([
        apiRequest<Artifact[]>("/projects/artifacts"),
        apiRequest<Meeting[]>("/meetings"),
      ]);

      if (artifactsRes.status === "fulfilled") {
        setArtifacts(artifactsRes.value);
      } else {
        console.error("Failed to fetch artifacts:", artifactsRes.reason);
      }

      if (meetingsRes.status === "fulfilled") {
        setAllMeetings(meetingsRes.value);
      } else {
        console.error("Failed to fetch meetings:", meetingsRes.reason);
      }

    } catch (error) {
      console.error("Unknown error in fetchData:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter Data
  const filteredArtifacts = artifacts.filter((a) =>
    a.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Split meetings into categories
  const activeMeetings = allMeetings.filter(m => m.status === "active") as any[];
  const pastMeetings = allMeetings.filter(m => m.status === "ended");
  const upcomingMeetings = allMeetings.filter(m => m.status === "scheduled");

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] -mt-6 -mx-6 bg-white overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sub-Navigation Sidebar */}
        <div className="w-64 bg-[#f8f9fa] border-r border-[#eaecf0] flex flex-col pt-6 px-4">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('my-meetings')}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === 'my-meetings' ? "text-[#cc2233] bg-[#fbeaec]" : "text-neutral-600 hover:bg-neutral-100"
              )}
            >
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4" />
                My Meetings
              </div>
            </button>

            <button
              onClick={() => setActiveTab('all-meetings')}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === 'all-meetings' ? "text-[#cc2233] bg-[#fbeaec]" : "text-neutral-600 hover:bg-neutral-100"
              )}
            >
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4" />
                All Meetings
              </div>
            </button>

            <button
              onClick={() => setActiveTab('shared')}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === 'shared' ? "text-[#cc2233] bg-[#fbeaec]" : "text-neutral-600 hover:bg-neutral-100"
              )}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4" />
                Shared With Me
              </div>
            </button>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto px-8 pt-6 pb-24">

          {/* Top Action Buttons (Schedule / Capture) */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <Button
              onClick={() => setIsScheduleMeetingOpen(true)}
              variant="outline"
              className="h-14 flex items-center justify-start gap-4 px-5 border-[#e2e4e9] shadow-sm hover:border-[#cc2233] hover:text-[#cc2233] bg-gradient-to-r from-white to-[#fdfafb] text-neutral-700 font-semibold"
            >
              <span className="p-2 rounded bg-[#cc2233] text-white">
                <Calendar className="w-5 h-5" />
              </span>
              Schedule Meeting
            </Button>

            <Button
              onClick={() => setIsHostMeetingOpen(true)}
              variant="outline"
              className="h-14 flex items-center justify-start gap-4 px-5 border-[#e2e4e9] shadow-sm hover:border-[#cc2233] hover:text-[#cc2233] bg-gradient-to-r from-white to-[#fdfafb] text-neutral-700 font-semibold"
            >
              <span className="p-2 rounded bg-[#cc2233] text-white">
                <Video className="w-5 h-5" />
              </span>
              Capture Meeting
            </Button>
          </div>

          {/* 1. Live Meetings Section (Only Active) */}
          <LiveMeetingList meetings={activeMeetings} isLoading={isLoading} />

          {/* 3. Past Meetings Section (Only Ended) */}
          <div className="mt-4">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Past Meetings</h2>
            <MeetingHistoryList meetings={pastMeetings} />
          </div>

        </div>
      </div>

      {/* Dialogs */}
      <UploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={() => fetchData()}
      />

      <HostMeetingDialog
        isOpen={isHostMeetingOpen}
        onClose={() => setIsHostMeetingOpen(false)}
      />

      <ScheduleMeetingDialog
        isOpen={isScheduleMeetingOpen}
        onClose={() => setIsScheduleMeetingOpen(false)}
        onScheduleComplete={() => fetchData()}
      />
    </div>
  );
}