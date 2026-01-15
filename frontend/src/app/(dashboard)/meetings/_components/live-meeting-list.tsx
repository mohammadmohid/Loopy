"use client";

import { Video, User, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

export interface LiveMeeting {
  _id: string;
  title: string;
  roomName: string;
  hostName: string;
  createdAt: string;
  projectId: string;
}

interface LiveMeetingListProps {
  meetings: LiveMeeting[];
  isLoading: boolean;
}

export function LiveMeetingList({ meetings, isLoading }: LiveMeetingListProps) {
  const router = useRouter();

  if (isLoading) {
    return <div className="h-20 bg-neutral-100 animate-pulse rounded-xl" />;
  }

  if (meetings.length === 0) {
    return null; // Don't show anything if no active meetings
  }

  return (
    <div className="space-y-4 mb-8">
      <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        Live & Upcoming Meetings
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {meetings.map((meeting) => (
          <div 
            key={meeting._id}
            className="bg-white border border-neutral-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
                {formatDistanceToNow(new Date(meeting.createdAt), { addSuffix: true })}
              </span>
            </div>

            <h3 className="font-semibold text-neutral-900 mb-1">{meeting.title}</h3>
            
            <div className="flex items-center gap-2 text-sm text-neutral-500 mb-6">
              <User className="w-4 h-4" />
              <span>Hosted by {meeting.hostName}</span>
            </div>

            <Button 
              className="w-full gap-2"
              onClick={() => router.push(`/meetings/live/${meeting.roomName}?projectId=${meeting.projectId}`)}
            >
              Join Meeting
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}