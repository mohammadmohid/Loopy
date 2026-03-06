"use client";

import { useState, useMemo } from "react"; // 👈 1. Import useMemo
import { useRouter } from "next/navigation";
import { Users, X, Play, FileText, Calendar, Clock, Filter } from "lucide-react"; // 👈 2. Import Filter Icon
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export interface Meeting {
  _id: string;
  title: string;
  roomName: string;
  hostName: string;
  projectName: string;
  participants: string[];
  createdAt: string;
  status: "active" | "ended" | "scheduled";
  endedAt?: string;
  scheduledAt?: string;
}

interface MeetingHistoryListProps {
  meetings: Meeting[];
}

export function MeetingHistoryList({ meetings }: MeetingHistoryListProps) {
  const [filterProject, setFilterProject] = useState("all"); // 👈 3. New State for Filter
  const router = useRouter();

  // 👈 4. Extract Unique Project Names automatically
  const uniqueProjects = useMemo(() => {
    // Get all project names, remove null/undefined, and remove duplicates
    const names = meetings.map(m => m.projectName).filter(Boolean);
    return Array.from(new Set(names));
  }, [meetings]);

  // 👈 5. Filter the list based on selection
  const filteredMeetings = meetings.filter(meeting => {
    if (filterProject === "all") return true;
    return meeting.projectName === filterProject;
  });

  if (meetings.length === 0) return null;

  return (
    <div className="mb-8">
      {/* New Header Row matching Mockup tabs */}
      <div className="flex border-b border-neutral-200">
        <div className="flex items-center gap-6">
          <button className="pb-3 text-base font-semibold text-[#cc2233] border-b-2 border-[#cc2233]">
            Meetings
          </button>
        </div>
        {/* Filter moved to the right side of the tab row */}
        <div className="ml-auto pb-2">
          <div className="relative bg-white border border-neutral-200 text-neutral-700 rounded-md px-2 py-0.5 shadow-sm hover:bg-neutral-50 transition-colors flex items-center">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="pl-2 pr-8 py-1 bg-transparent text-sm font-medium outline-none appearance-none cursor-pointer w-full"
            >
              <option value="all">All Projects</option>
              {uniqueProjects.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1L5 5L9 1" /></svg>
            </div>
          </div>
        </div>
      </div >

      <div className="flex flex-col divide-y divide-neutral-100">
        {/* 👈 7. Render filtered list instead of full list */}
        {filteredMeetings.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 bg-neutral-50 border border-dashed border-neutral-200 rounded-xl mt-4">
            No meetings found for project "{filterProject}"
          </div>
        ) : (
          filteredMeetings.map((meeting) => {
            // Extract initials (e.g., "John Doe" -> "JD")
            const initials = meeting.hostName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase();

            return (
              <div
                key={meeting._id}
                onClick={() => router.push(`/meetings/${meeting._id}`)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between py-5 bg-white hover:bg-neutral-50 cursor-pointer transition-colors px-4 -mx-4 rounded-lg"
              >
                <div className="flex items-start sm:items-center gap-16 w-full max-w-2xl">

                  {/* Column 1: Title and Host */}
                  <div className="flex flex-col gap-1.5 min-w-[200px]">
                    <span className="font-semibold text-neutral-900 group-hover:text-primary transition-colors text-base">
                      {meeting.title}
                    </span>
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <span>Host</span>
                      <div className="bg-neutral-200 text-neutral-600 font-bold rounded-full w-7 h-7 flex items-center justify-center text-xs">
                        {initials}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Date and Time */}
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(meeting.scheduledAt || meeting.createdAt), "eee, MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <Clock className="w-4 h-4" />
                      <span>{format(new Date(meeting.scheduledAt || meeting.createdAt), "hh:mm a")}</span>
                    </div>
                  </div>

                </div>

                {/* Column 3: Duration */}
                <div className="mt-3 sm:mt-0 text-sm text-neutral-400 font-medium">
                  20 mins
                </div>
              </div>
            );
          })
        )}
      </div>

    </div >
  );
}