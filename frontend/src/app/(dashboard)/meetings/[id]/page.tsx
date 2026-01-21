"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { TranscriptPlayer } from "../_components/transcript-player";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Download, Loader2, Video } from "lucide-react";

// 1. Define Interfaces
interface Meeting {
  _id: string;
  title: string;
  roomName: string;
  status: "active" | "ended";
  recordingUrl?: string;
  createdAt: string;
}

interface ArtifactDetail {
  _id: string;
  filename: string;
  transcriptionStatus: string;
  transcriptJson?: any; 
  createdAt: string;
}

export default function MeetingDetailPage() {
  const { id } = useParams();
  
  // 2. Separate State for Meeting vs Artifact
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [artifact, setArtifact] = useState<ArtifactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // STEP A: Fetch Basic Meeting Details (This should always succeed)
        const meetingData = await apiRequest<Meeting>(`/meetings/${id}`);
        setMeeting(meetingData);

        // STEP B: Check if we should fetch the transcript
        // If meeting is active or has no recording yet, STOP here.
        if (meetingData.status === "active" || !meetingData.recordingUrl) {
          console.log("Meeting is active/new. Skipping artifact fetch.");
          return; 
        }

        // STEP C: Fetch Artifact (Only if ready)
        // We use a try/catch here specifically so a missing transcript doesn't crash the whole page
        try {
          const artifactData = await apiRequest<ArtifactDetail>(`/projects/artifacts/${id}`);
          setArtifact(artifactData);
        } catch (artifactErr) {
          console.log("Artifact not ready yet:", artifactErr);
          // Do not set main 'error' state here, just leave artifact null
        }

      } catch (e) {
        console.error("Critical Error:", e);
        setError("Failed to load meeting details");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-neutral-400 w-8 h-8" />
      </div>
    );
  }

  // --- Error State ---
  if (error || !meeting) {
    return <div className="p-8 text-center text-red-500">{error || "Meeting not found"}</div>;
  }

  // --- Active Meeting State (The Fix!) ---
  if (meeting.status === "active") {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)] items-center justify-center space-y-4">
        <div className="bg-primary/10 p-4 rounded-full">
          <Video className="w-12 h-12 text-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900">Meeting in Progress</h2>
        <p className="text-neutral-500 max-w-md text-center">
          This meeting is currently live. The recording and transcript will be processed automatically once the meeting ends.
        </p>
        <Link href={`/meetings/join/${meeting.roomName || id}`}>
           <Button>Join Meeting</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/meetings">
            <Button variant="ghost" size="sm" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">
              {meeting.title}
            </h1>
            <div className="flex items-center text-sm text-neutral-500 mt-1">
              <Calendar className="mr-1 h-3 w-3" />
              {new Date(meeting.createdAt).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
        <div>
          <Button variant="outline" size="sm" disabled={!artifact}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0">
        {artifact && artifact.transcriptionStatus === "COMPLETED" && artifact.transcriptJson ? (
          <TranscriptPlayer
            transcript={artifact.transcriptJson}
            audioUrl={meeting.recordingUrl || ""}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-neutral-200">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-neutral-500">
              {artifact 
                ? `Processing transcript (Status: ${artifact.transcriptionStatus})...`
                : "Waiting for recording to finish upload..."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}