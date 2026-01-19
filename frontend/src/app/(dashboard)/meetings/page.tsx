"use client";

import { useState, useEffect } from "react";
import { UploadCloud, Search, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadDialog } from "@/components/upload-dialog";
import { MeetingList, type Artifact } from "./_components/meeting-list";
import { HostMeetingDialog } from "./_components/host-meeting-dialog";
import { LiveMeetingList } from "./_components/live-meeting-list";
import { MeetingHistoryList, type Meeting } from "./_components/meeting-history-list"; 
import { apiRequest } from "@/lib/api";

export default function MeetingsPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isHostMeetingOpen, setIsHostMeetingOpen] = useState(false);
  
  // Data State
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [allMeetings, setAllMeetings] = useState<Meeting[]>([]); // Store ALL meetings here
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch Artifacts and Meetings in parallel
      const [artifactsData, meetingsData] = await Promise.all([
        apiRequest<Artifact[]>("/projects/artifacts"),
        apiRequest<Meeting[]>("/meetings"), // This now returns both active and ended
      ]);
      
      setArtifacts(artifactsData);
      setAllMeetings(meetingsData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
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

  // Split meetings into Live and Past
  const activeMeetings = allMeetings.filter(m => m.status === "active") as any[];
  const pastMeetings = allMeetings.filter(m => m.status === "ended");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Meetings</h1>
          <p className="text-neutral-500 text-sm mt-1">
            Manage your recordings and transcriptions
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsHostMeetingOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <Video className="w-4 h-4" />
            Host Meeting
          </Button>

          <Button
            onClick={() => setIsUploadOpen(true)}
            className="gap-2 bg-primary shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Audio
          </Button>
        </div>
      </div>

      {/* 1. Live Meetings Section (Only Active) */}
      <LiveMeetingList meetings={activeMeetings} isLoading={isLoading} />

      {/* 2. Past Meetings Section (Only Ended) */}
      <MeetingHistoryList meetings={pastMeetings} />

      {/* Search and Filters */}
      <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-neutral-200 max-w-md">
        <Search className="w-4 h-4 text-neutral-400 ml-3" />
        <input
          type="text"
          placeholder="Search recordings..."
          className="flex-1 py-2 text-sm outline-none placeholder:text-neutral-400"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* 3. Uploaded Recordings List */}
      <MeetingList artifacts={filteredArtifacts} isLoading={isLoading} />

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
    </div>
  );
}