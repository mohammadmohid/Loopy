"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, VideoOff } from "lucide-react";

interface Meeting {
  _id: string;
  title: string;
  recordingUrl?: string;
}

export default function MeetingRecordingPage() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        const data = await apiRequest<Meeting>(`/meetings/${id}`);
        setMeeting(data);
      } catch (e) {
        console.error("Failed to load meeting", e);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchMeeting();
  }, [id]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-neutral-950">
        <Loader2 className="text-white w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (!meeting) return <div className="text-white p-8">Meeting not found</div>;

  return (
    <div className="flex flex-col h-screen bg-neutral-950">
      {/* Navbar Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center gap-4 z-10 bg-gradient-to-b from-black/80 to-transparent">
        <Link href={`/meetings/${id}`}>
          <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white rounded-full">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Details
          </Button>
        </Link>
        <h1 className="text-white font-medium text-lg drop-shadow-md">
          {meeting.title} <span className="text-white/60 mx-2">•</span> Recording
        </h1>
      </div>

      {/* Main Video Player */}
      <div className="flex-1 flex items-center justify-center p-4">
        {meeting.recordingUrl ? (
          <video
            src={meeting.recordingUrl}
            controls
            autoPlay
            className="w-full max-w-6xl max-h-[85vh] rounded-lg shadow-2xl border border-neutral-800 bg-black"
          />
        ) : (
          <div className="flex flex-col items-center text-neutral-500">
            <VideoOff className="w-16 h-16 mb-4 opacity-50" />
            <p>No recording file available.</p>
          </div>
        )}
      </div>
    </div>
  );
}