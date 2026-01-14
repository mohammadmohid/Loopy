"use client";

import { useState, useEffect } from "react";
import { UploadCloud, Search, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UploadDialog } from "@/components/upload-dialog";
import { MeetingList, type Artifact } from "./_components/meeting-list";
import { HostMeetingDialog } from "./_components/host-meeting-dialog";
import { apiRequest } from "@/lib/api";

export default function MeetingsPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isHostMeetingOpen, setIsHostMeetingOpen] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchArtifacts = async () => {
    try {
      setIsLoading(true);
      const data = await apiRequest<Artifact[]>("/projects/artifacts");
      setArtifacts(data);
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArtifacts();
  }, []);

  const filteredArtifacts = artifacts.filter((a) =>
    a.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          {/* New Host Meeting Button */}
          <Button
            onClick={() => setIsHostMeetingOpen(true)}
            variant="outline"
            className="gap-2"
          >
            <Video className="w-4 h-4" />
            Host Meeting
          </Button>

          {/* Existing Upload Button */}
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="gap-2 bg-primary shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Audio
          </Button>
        </div>
      </div>

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

      {/* List */}
      <MeetingList artifacts={filteredArtifacts} isLoading={isLoading} />

      {/* Upload Dialog */}
      <UploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={() => {
          fetchArtifacts(); // Refresh list after upload
        }}
      />

      {/* Host Meeting Dialog */}
      <HostMeetingDialog
        isOpen={isHostMeetingOpen}
        onClose={() => setIsHostMeetingOpen(false)}
      />
    </div>
  );
}