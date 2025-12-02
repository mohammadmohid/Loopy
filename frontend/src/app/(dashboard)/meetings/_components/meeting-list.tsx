"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Calendar, Clock, Users, Activity, FileAudio } from "lucide-react";
import { cn } from "@/lib/utils";

// Type definition based on Scribe v1 response structure
interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  type: "word" | "audio_event";
  speaker_id?: string;
}

export interface Artifact {
  _id: string;
  filename: string;
  createdAt: string;
  transcriptionStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  transcriptJson?: { words: TranscriptWord[] };
  projectId?: { name: string };
}

interface MeetingListProps {
  artifacts: Artifact[];
  isLoading: boolean;
}

export function MeetingList({ artifacts, isLoading }: MeetingListProps) {
  if (isLoading) {
    return (
      <div className="text-center py-10 text-neutral-500">
        Loading meetings...
      </div>
    );
  }

  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50">
        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
          <FileAudio className="w-6 h-6 text-neutral-400" />
        </div>
        <p className="font-medium text-neutral-900">No meetings recorded</p>
        <p className="text-sm text-neutral-500">
          Upload a meeting to get started
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {artifacts.map((meeting) => {
        // --- Derived Metrics Calculation ---
        const words = meeting.transcriptJson?.words || [];
        const lastWord = words.length > 0 ? words[words.length - 1] : null;

        // Calculate Duration (minutes)
        const duration = lastWord ? Math.round(lastWord.end / 60) : 0;

        // Calculate Unique Speakers
        const uniqueSpeakers = new Set(
          words.filter((w) => w.speaker_id).map((w) => w.speaker_id)
        ).size;

        // Check for Audio Events (e.g. Laughter)
        const hasAudioEvents = words.some((w) => w.type === "audio_event");

        return (
          <Link
            key={meeting._id}
            href={`/meetings/${meeting._id}`}
            className="group block h-full"
          >
            <div className="h-full bg-white border border-neutral-200 rounded-xl p-5 hover:shadow-md transition-shadow duration-200 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-base font-semibold text-neutral-900 group-hover:text-primary transition-colors line-clamp-1">
                    {meeting.filename}
                  </h3>
                  <div className="flex items-center text-xs text-neutral-500 mt-1">
                    <Calendar className="mr-1 h-3 w-3" />
                    {formatDistanceToNow(new Date(meeting.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>
                <StatusBadge status={meeting.transcriptionStatus} />
              </div>

              <div className="flex-1">
                {meeting.transcriptionStatus === "COMPLETED" ? (
                  <div className="grid grid-cols-2 gap-4 text-sm text-neutral-600">
                    <div className="flex items-center">
                      <Clock className="mr-2 h-4 w-4 text-neutral-400" />
                      {duration} mins
                    </div>
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4 text-neutral-400" />
                      {uniqueSpeakers} Speakers
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-neutral-400 italic h-full">
                    Analysis in progress...
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 flex gap-2">
                {hasAudioEvents && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium">
                    <Activity className="mr-1 h-3 w-3" /> Events Detected
                  </span>
                )}
                {meeting.projectId && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-neutral-100 text-neutral-600 text-xs font-medium">
                    {meeting.projectId.name}
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    PROCESSING: "bg-blue-100 text-blue-700 animate-pulse",
    COMPLETED: "bg-emerald-100 text-emerald-700",
    FAILED: "bg-red-100 text-red-700",
  };

  const label = status.charAt(0) + status.slice(1).toLowerCase();

  return (
    <span
      className={cn(
        "px-2.5 py-0.5 rounded-full text-xs font-medium border border-transparent",
        styles[status] || "bg-neutral-100 text-neutral-700"
      )}
    >
      {label}
    </span>
  );
}
