"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { TranscriptPlayer } from "../_components/transcript-player";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  Download,
  Loader2,
  Video,
  Bot,
  FileWarning,
  FileText,
  AlignLeft,
  Sparkles,
  RefreshCcw
} from "lucide-react";

// 1. Define Interfaces
interface Meeting {
  _id: string;
  title: string;
  projectId: string;
  roomName: string;
  status: "active" | "ended";
  recordingUrl?: string;
  createdAt: string;
}

interface ArtifactDetail {
  _id: string;
  filename: string;
  transcriptionStatus: "pending" | "processing" | "COMPLETED" | "FAILED";
  transcriptJson?: any;
  summary?: string;
  createdAt: string;
  error?: string;
}

export default function MeetingDetailPage() {
  const { id } = useParams();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [artifact, setArtifact] = useState<ArtifactDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // State for the big transcription button
  const [generating, setGenerating] = useState(false);

  // State for the summary retry button
  const [summarizing, setSummarizing] = useState(false);

  // New State: Are we waiting for a background summary to finish?
  const [isPollingSummary, setIsPollingSummary] = useState(false);

  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"summary" | "transcript">("summary");

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const meetingData = await apiRequest<Meeting>(`/meetings/${id}`);
        setMeeting(meetingData);

        if (meetingData.status === "active") return;

        try {
          const artifactData = await apiRequest<ArtifactDetail>(`/artifacts/${id}`, {
            cache: 'no-store',
            next: { revalidate: 0 }
          } as any);
          setArtifact(artifactData);
        } catch (artifactErr) {
          console.warn("⚠️ Artifact fetch failed:", artifactErr);
          setArtifact(null);
        }

      } catch (e) {
        console.error("Critical Error:", e);
        setError("Failed to load meeting details");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  // 2. Poll for updates (Handles both Transcription and Summary)
  useEffect(() => {
    if (
      artifact?.transcriptionStatus === "processing" ||
      artifact?.transcriptionStatus === "pending" ||
      isPollingSummary // 👈 Poll if we are explicitly waiting for summary
    ) {
      const interval = setInterval(async () => {
        try {
          const updated = await apiRequest<ArtifactDetail>(`/artifacts/${id}`, {
            cache: 'no-store',
            next: { revalidate: 0 }
          } as any);

          setArtifact(updated);

          // Stop polling if Transcription is done (and we aren't waiting for summary)
          if (!isPollingSummary && (updated.transcriptionStatus === "COMPLETED" || updated.transcriptionStatus === "FAILED")) {
            clearInterval(interval);
          }

          // Stop polling if Summary has arrived
          if (isPollingSummary && updated.summary) {
            setIsPollingSummary(false);
            setSummarizing(false);
            clearInterval(interval);
          }

        } catch (e) { console.error("Polling...", e); }
      }, 3000); // Check every 3s

      return () => clearInterval(interval);
    }
  }, [artifact, id, isPollingSummary]);

  // 3. Manual Trigger (Full Transcription)
  const handleGenerateSummary = async () => {
    if (!meeting || !meeting.recordingUrl) return;
    try {
      setGenerating(true);
      await apiRequest("/artifacts/transcribe", {
        method: "POST",
        data: {
          meetingId: meeting._id,
          projectId: meeting.projectId,
          recordingUrl: meeting.recordingUrl,
          filename: meeting.title
        }
      });

      setArtifact({
        _id: "temp",
        transcriptionStatus: "processing",
        filename: meeting.title,
        createdAt: new Date().toISOString()
      } as ArtifactDetail);

    } catch (err) {
      console.error("Failed to start generation", err);
      alert("Failed to start transcription.");
    } finally {
      setGenerating(false);
    }
  };

  // 4. Manual Summary Only (Updated for Fire-and-Forget)
  const handleGenerateSummaryOnly = async () => {
    if (!artifact) return;
    try {
      setSummarizing(true);

      // 1. Trigger Backend (Returns immediately now)
      await apiRequest("/artifacts/summary", {
        method: "POST",
        data: { meetingId: meeting?._id }
      });

      // 2. Clear local summary temporarily so polling waits for the NEW one
      setArtifact(prev => prev ? { ...prev, summary: "" } : null);

      // 3. Start Polling
      setIsPollingSummary(true);

    } catch (err) {
      alert("Failed to start summary generation.");
      console.error(err);
      setSummarizing(false);
    }
  };

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

  // --- Active Meeting State ---
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
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* VIEW TOGGLE */}
          {artifact && artifact.transcriptionStatus === "COMPLETED" && (
            <div className="bg-neutral-100 p-1 rounded-lg flex items-center border border-neutral-200">
              <button
                onClick={() => setViewMode("summary")}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === "summary"
                    ? "bg-white shadow-sm text-neutral-900 border border-neutral-200/50"
                    : "text-neutral-500 hover:text-neutral-700"
                  }`}
              >
                <FileText className="w-4 h-4" />
                Summary
              </button>
              <button
                onClick={() => setViewMode("transcript")}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === "transcript"
                    ? "bg-white shadow-sm text-neutral-900 border border-neutral-200/50"
                    : "text-neutral-500 hover:text-neutral-700"
                  }`}
              >
                <AlignLeft className="w-4 h-4" />
                Transcript
              </button>
            </div>
          )}

          <Button variant="outline" size="sm" disabled={!artifact || artifact.transcriptionStatus !== "COMPLETED"}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0">
        {(() => {
          // 1. SAFETY CHECK
          if (!artifact) {
            return meeting.recordingUrl ? (
              <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-neutral-200 space-y-4">
                <div className="bg-neutral-100 p-4 rounded-full">
                  <Bot className="w-8 h-8 text-neutral-600" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900">Transcript Not Generated</h3>
                <p className="text-neutral-500 max-w-sm text-center">
                  This is a past meeting. You can manually trigger the AI to transcribe the recording now.
                </p>
                <Button
                  onClick={handleGenerateSummary}
                  disabled={generating}
                  className="mt-2"
                >
                  {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                  Generate AI Summary
                </Button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-neutral-200 text-neutral-400">
                <FileWarning className="h-10 w-10 mb-4 text-neutral-300" />
                <p>No recording available for this meeting.</p>
              </div>
            );
          }

          // 2. STATUS CHECK
          switch (artifact.transcriptionStatus) {
            case "COMPLETED":
              if (!artifact.transcriptJson) {
                return (
                  <div className="h-full flex flex-col items-center justify-center text-amber-600 p-8">
                    <FileWarning className="h-10 w-10 mb-4" />
                    <h3 className="text-lg font-semibold">Transcript Data Missing</h3>
                    <p className="text-center max-w-md">The transcription is marked as completed, but the text data was not received.</p>
                  </div>
                );
              }

              if (viewMode === "summary") {
                // Check for error in summary text
                const isSummaryError =
                  artifact.summary === "Summary generation failed. Please try again." ||
                  artifact.summary === "Transcript too short to summarize." ||
                  artifact.summary === "System Error: API Key missing.";

                return (
                  <div className="bg-white rounded-xl border border-neutral-200 h-full overflow-hidden flex flex-col">
                    <div className="p-8 overflow-y-auto">
                      <div className="max-w-3xl mx-auto">
                        <h3 className="text-2xl font-bold mb-6 text-neutral-900 flex items-center gap-3">
                          <Bot className="w-6 h-6 text-primary" />
                          AI Summary
                        </h3>
                        <div className="prose prose-neutral max-w-none">
                          {!isSummaryError ? (
                            <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed text-neutral-700 bg-neutral-50/50 p-6 rounded-lg border border-neutral-100">
                              {artifact.summary}
                            </pre>
                          ) : (
                            // RETRY STATE
                            <div className="flex flex-col items-center justify-center py-12 px-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-300 gap-4 text-center">
                              <div className="bg-white p-3 rounded-full shadow-sm">
                                <FileWarning className={`w-6 h-6 ${isSummaryError ? "text-red-500" : "text-amber-500"}`} />
                              </div>
                              <div>
                                <p className="text-neutral-900 font-medium">
                                  {isSummaryError ? "Summary Generation Failed" : "Summary Unavailable"}
                                </p>
                                <p className="text-neutral-500 text-sm mt-1 max-w-md mx-auto">
                                  {artifact.summary || "No summary was generated for this meeting yet."}
                                </p>
                              </div>

                              <Button
                                onClick={handleGenerateSummaryOnly}
                                disabled={summarizing}
                                className={`mt-2 ${isSummaryError ? "bg-red-600 hover:bg-red-700 text-white" : ""}`}
                              >
                                {summarizing ? <Loader2 className="animate-spin mr-2 w-4 h-4" /> : <RefreshCcw className="mr-2 w-4 h-4" />}
                                Retry Generation
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <TranscriptPlayer
                  transcript={artifact.transcriptJson}
                  audioUrl={meeting.recordingUrl || ""}
                />
              );

            case "processing":
            case "pending":
              return (
                <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-neutral-200">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-neutral-900 font-medium">AI is generating your transcript...</p>
                  <p className="text-neutral-500 text-sm mt-2">This may take a few minutes depending on the length.</p>
                </div>
              );

            case "FAILED":
              return (
                <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-neutral-200 text-red-500">
                  <FileWarning className="h-10 w-10 mb-4" />
                  <p className="font-semibold">Transcription Failed</p>
                  <p className="text-sm mt-2">{artifact.error || "Unknown error occurred"}</p>
                  <Button variant="outline" onClick={handleGenerateSummary} className="mt-4">Retry</Button>
                </div>
              );

            default:
              return (
                <div className="p-8 text-center text-neutral-400">
                  Unknown Status: {artifact.transcriptionStatus}
                </div>
              );
          }
        })()}
      </main>
    </div>
  );
}