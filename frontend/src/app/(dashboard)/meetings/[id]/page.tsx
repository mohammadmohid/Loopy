"use client";

import { useEffect, useState } from "react";
import Markdown from "react-markdown";
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
  RefreshCcw,
  Users,
  MessageSquare,
  Play
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
  hostName?: string;
  participants?: string[];
}

interface ArtifactDetail {
  _id: string;
  filename: string;
  transcriptionStatus: "pending" | "processing" | "COMPLETED" | "FAILED";
  transcriptJson?: any;
  summary?: string;
  overview?: string;
  agenda?: string[];
  createdAt: string;
  error?: string;
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export default function MeetingDetailPage() {
  const { id } = useParams();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [artifact, setArtifact] = useState<ArtifactDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // State for the big transcription button
  const [generating, setGenerating] = useState(false);

  // State for the summary retry button
  const [summarizing, setSummarizing] = useState(false);

  // New State: Are we waiting for a background summary to finish?
  const [isPollingSummary, setIsPollingSummary] = useState(false);

  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"summary" | "transcript">("summary");

  const activeTabObj = ["Transcript", "Participants", "Comments", "Ask Bot", "Minutes"];
  const [activeTab, setActiveTab] = useState("Transcript");

  // 1. Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [meetingData, usersData] = await Promise.all([
          apiRequest<Meeting>(`/meetings/${id}`),
          apiRequest<User[]>('/auth/users').catch(() => []) // Fallback in case network fails
        ]);

        setMeeting(meetingData);
        setUsers(usersData);

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
        data: {
          meetingId: meeting?._id,
          meetingTitle: meeting?.title,
          date: meeting?.createdAt
        }
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

  // Retroactive support + New DB format mapping
  let parsedSummary: { overview: string, agenda: string[], minutes: string } = {
    overview: artifact?.overview || "",
    agenda: artifact?.agenda || [],
    minutes: artifact?.summary || ""
  };

  // Fallback for older database entries where 'summary' was entirely a JSON string
  if (artifact?.summary && artifact.summary.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(artifact.summary);
      if (parsed.overview) parsedSummary.overview = parsed.overview;
      if (parsed.agenda) parsedSummary.agenda = parsed.agenda;
      if (parsed.minutes) parsedSummary.minutes = parsed.minutes;
    } catch (e) {
      // It's just a raw text summary
    }
  }

  const isSummaryError =
    artifact?.summary === "Summary generation failed. Please try again." ||
    artifact?.summary === "Transcript too short to summarize." ||
    artifact?.summary === "System Error: API Key missing.";

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-white -mx-6 -mt-6">

      {/* Main Content Area: Side-by-Side Flex Layout */}
      <main className="flex-1 min-h-0 flex pt-6 px-6 pb-20 overflow-hidden relative gap-6">

        {/* --- LEFT PANE (Video + Summary) --- */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto no-scrollbar scroll-smooth">

          {/* Video Player Box */}
          <div className="w-full shrink-0 bg-black rounded-xl aspect-[4/3] overflow-hidden relative flex items-center justify-center">
            {meeting.recordingUrl ? (
              <video
                className="w-full h-full object-contain"
                src={meeting.recordingUrl}
                controls
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
                <Video className="w-12 h-12 mb-3 text-neutral-300" />
                <p>No recording available</p>
              </div>
            )}
          </div>

          {/* Meeting Info Section */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">{meeting.title}</h1>
                <div className="flex items-center gap-4 text-sm text-neutral-500 mt-2">
                  <span className="flex items-center gap-1.5"><Users className="w-4 h-4" /> Host: {meeting.hostName || "Unknown"}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />
                    {new Date(meeting.createdAt).toLocaleDateString(undefined, {
                      weekday: "short", year: "numeric", month: "short", day: "numeric",
                    })}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="hidden sm:flex rounded-md text-xs h-8 text-neutral-600 bg-neutral-50 shadow-none border-neutral-200">
                Hide Video
              </Button>
            </div>

            {/* Optional Tags Line */}
            <div className="flex items-center gap-2 mt-2">
              {["Marketing", "Sync", "Quarterly"].map((tag, i) => (
                <span key={i} className="px-3 py-1 bg-neutral-100 text-neutral-600 rounded-full text-xs font-medium">#{tag}</span>
              ))}
            </div>
          </div>

          {/* Summary / Overview Section */}
          <div className="mt-4 mb-8 space-y-6 text-neutral-800">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Summary
            </h2>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-neutral-900">Overview</h3>
              <p className="text-sm leading-relaxed text-neutral-600">
                {parsedSummary.overview || "No overview available for this meeting yet. Try generating AI Minutes."}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-neutral-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary block"></span> Agenda
              </h3>
              {parsedSummary.agenda && parsedSummary.agenda.length > 0 ? (
                <ul className="list-disc pl-5 text-sm text-neutral-600 leading-relaxed space-y-1">
                  {parsedSummary.agenda.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500 italic">No agenda detected.</p>
              )}
            </div>
          </div>
        </div>


        {/* --- RIGHT PANE (Tabs) --- */}
        <div className="w-[550px] 2xl:w-[650px] shrink-0 flex flex-col bg-white overflow-hidden -mt-6 border-l border-neutral-100">

          {/* Tabs Header */}
          <div className="flex items-center gap-6 px-4 pt-6 pb-0 border-b border-neutral-200">
            {activeTabObj.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-1.5 ${activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-neutral-500 hover:text-neutral-700"
                  }`}
              >
                {tab}
                {tab === "Ask Bot" && <Bot className="w-4 h-4" />}
              </button>
            ))}
          </div>

          {/* Tabs Content */}
          <div className="flex-1 overflow-y-auto w-full px-2 py-4">

            {activeTab === "Transcript" && (
              <div className="h-full">
                {!artifact || artifact.transcriptionStatus !== "COMPLETED" ? (
                  <div className="h-full flex flex-col items-center justify-center bg-neutral-50 rounded-xl border border-dashed border-neutral-200 text-neutral-400 p-8 text-center space-y-4">
                    {artifact?.transcriptionStatus === "processing" ? (
                      <>
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-neutral-900 font-medium">Generating Transcript...</p>
                      </>
                    ) : (
                      <>
                        <AlignLeft className="h-10 w-10 mb-2 text-neutral-300" />
                        <p className="font-semibold text-neutral-700">Transcript Not Available</p>
                        <Button onClick={handleGenerateSummary} disabled={generating} size="sm" className="mt-2">
                          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bot className="w-4 h-4 mr-2" />}
                          Generate Now
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  <TranscriptPlayer
                    transcript={artifact.transcriptJson}
                    audioUrl={meeting.recordingUrl || ""}
                  />
                )}
              </div>
            )}

            {activeTab === "Participants" && (
              <div className="p-4 space-y-4">
                <h3 className="font-semibold text-sm mb-4">Meeting Participants</h3>
                {(meeting.participants?.length ?? 0) > 0 ? (
                  meeting.participants?.map((pid: string, idx: number) => {
                    const user = users.find(u => u.id === pid);
                    const displayName = user ? `${user.firstName} ${user.lastName}` : pid;
                    const initials = user
                      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                      : `P${idx + 1}`;

                    return (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-neutral-50 border border-neutral-100 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-600">
                          {initials}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-neutral-900">{displayName}</span>
                          {user && <span className="text-xs text-neutral-500">{user.email}</span>}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-neutral-500 italic">No external participants recorded.</p>
                )}
              </div>
            )}

            {activeTab === "Minutes" && (
              <div className="p-4">
                {isSummaryError ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 bg-neutral-50 rounded-xl border border-dashed border-neutral-300 gap-4 text-center">
                    <FileWarning className="w-8 h-8 text-red-500" />
                    <p className="text-neutral-900 font-medium">Minutes Generation Failed</p>
                    <Button onClick={handleGenerateSummaryOnly} disabled={summarizing} variant="outline" size="sm">
                      {summarizing ? "Retrying..." : "Retry"}
                    </Button>
                  </div>
                ) : (
                  <div className="prose prose-sm prose-neutral max-w-none">
                    {parsedSummary.minutes ? (
                      <div className="bg-white rounded-xl shadow-sm border border-neutral-100 p-6 sm:p-8">
                        <Markdown
                          components={{
                            h1: ({ node, ...props }) => <h1 className="text-2xl font-bold text-[#cc2233] mb-6 pb-4 border-b border-neutral-100" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-neutral-800 mt-8 mb-4" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-md font-bold text-neutral-800 mt-6 mb-3" {...props} />,
                            p: ({ node, ...props }) => <p className="text-sm text-neutral-600 mb-4 leading-relaxed" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-5 space-y-2 mb-6 text-sm text-neutral-600" {...props} />,
                            li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-semibold text-neutral-900" {...props} />,
                          }}
                        >
                          {parsedSummary.minutes}
                        </Markdown>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 border border-dashed border-neutral-200 rounded-xl bg-neutral-50">
                        <Bot className="w-10 h-10 text-neutral-400" />
                        <p className="text-neutral-500 max-w-[250px] text-sm">No exact minutes found. If you just created this meeting, please click "Generate AI Summary".</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {(activeTab === "Comments" || activeTab === "Ask Bot") && (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-neutral-400">
                <MessageSquare className="w-10 h-10 mb-4 opacity-50" />
                <p>This tab is coming soon!</p>
              </div>
            )}

          </div>
        </div>

      </main>

      {/* --- BOTTOM PLAYBACK BAR --- */}
      <footer className="h-16 border-t border-neutral-200 bg-white flex items-center justify-between px-6 absolute bottom-0 left-[260px] right-0 z-10 w-auto">
        <div className="text-sm text-neutral-500 font-medium w-32 flex-shrink-0">
          00:00 / 00:00
        </div>
        <div className="flex-1 flex justify-center items-center gap-6">
          <button className="text-neutral-400 hover:text-neutral-700 transition">
            <RefreshCcw className="w-5 h-5 -scale-x-100" />
          </button>
          <button className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition shadow-sm">
            <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
          </button>
          <button className="text-neutral-400 hover:text-neutral-700 transition">
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>
        <div className="w-32 flex-shrink-0"></div>
      </footer>

    </div>
  );
}