"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { TranscriptPlayer } from "../_components/transcript-player";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Download, Loader2 } from "lucide-react";

// Matches Artifact model structure
interface ArtifactDetail {
  _id: string;
  filename: string;
  transcriptionStatus: string;
  transcriptJson?: any; // The full JSON from ElevenLabs
  createdAt: string;
}

export default function MeetingDetailPage() {
  const { id } = useParams();
  const [artifact, setArtifact] = useState<ArtifactDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtifact = async () => {
      try {
        const res = await apiRequest<ArtifactDetail>(
          `/projects/artifacts/${id}`
        );
        setArtifact(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchArtifact();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-neutral-400 w-8 h-8" />
      </div>
    );
  }

  if (!artifact) {
    return <div className="p-8 text-center">Meeting not found</div>;
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
              {artifact.filename}
            </h1>
            <div className="flex items-center text-sm text-neutral-500 mt-1">
              <Calendar className="mr-1 h-3 w-3" />
              {new Date(artifact.createdAt).toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
        <div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0">
        {artifact.transcriptionStatus === "COMPLETED" &&
        artifact.transcriptJson ? (
          <TranscriptPlayer
            transcript={artifact.transcriptJson}
            // Note: You need to implement a route to get a signed URL for the audio file
            // For now, leaving empty or placeholder
            audioUrl=""
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-neutral-200">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-neutral-500">
              Processing transcript (Status: {artifact.transcriptionStatus})...
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
