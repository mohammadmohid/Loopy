"use client";

import { useState, useMemo } from "react"; // 👈 1. Import useMemo
import { useRouter } from "next/navigation";
import { Calendar, Clock, Pencil } from "lucide-react"; // 👈 2. Import Filter Icon
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { resolveHostDisplayName, type PopulatedMeetingHost } from "@/lib/meeting-host";
import { useAuth } from "@/lib/auth-provider";
import { EditScheduledMeetingDialog } from "./edit-scheduled-meeting-dialog";

export interface Meeting {
  _id: string;
  title: string;
  roomName: string;
  /** Backend may omit (e.g. older docs or scheduled stubs). */
  hostName?: string;
  hostId?: string | PopulatedMeetingHost;
  projectName?: string;
  participants?: string[];
  createdAt: string;
  status: "active" | "ended" | "scheduled";
  endedAt?: string;
  scheduledAt?: string;
}

function meetingHostId(meeting: Meeting): string {
  const h = meeting.hostId;
  if (typeof h === "string") return h;
  if (h && typeof h === "object" && "_id" in h && h._id != null) return String(h._id);
  return "";
}

interface MeetingHistoryListProps {
  meetings: Meeting[];
  /** When true, scheduled meetings show an edit control for the host (title, date/time, participants). */
  editableScheduled?: boolean;
  onScheduledMeetingUpdated?: () => void;
}

export function MeetingHistoryList({
  meetings,
  editableScheduled = false,
  onScheduledMeetingUpdated,
}: MeetingHistoryListProps) {
  const [filterProject, setFilterProject] = useState("all"); // 👈 3. New State for Filter
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const router = useRouter();
  const { user } = useAuth();

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

  const uid = user?.id ?? "";

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
            const hostLabel = resolveHostDisplayName(meeting);
            const initials =
              hostLabel
                .split(/\s+/)
                .filter(Boolean)
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase() || "?";

            const isScheduled = meeting.status === "scheduled";
            const isHost = Boolean(uid && meetingHostId(meeting) === uid);
            const showEdit =
              editableScheduled && isScheduled && isHost;
            const when = meeting.scheduledAt || meeting.createdAt;
            const whenDate = when ? new Date(when) : new Date();
            const dateLabel = Number.isNaN(whenDate.getTime())
              ? "—"
              : format(whenDate, "eee, MMM d, yyyy");
            const timeLabel = Number.isNaN(whenDate.getTime())
              ? "—"
              : format(whenDate, "hh:mm a");

            return (
              <div
                key={meeting._id}
                onClick={
                  isScheduled
                    ? undefined
                    : () => router.push(`/meetings/${meeting._id}`)
                }
                className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-5 bg-white transition-colors px-4 -mx-4 rounded-lg ${isScheduled ? "cursor-default" : "hover:bg-neutral-50 cursor-pointer"
                  }`}
              >
                <div className="flex items-start sm:items-center gap-16 w-full max-w-2xl">

                  {/* Column 1: Title and Host */}
                  <div className="flex flex-col gap-1.5 min-w-[200px]">
                    <span className={`font-semibold text-neutral-900 transition-colors text-base ${isScheduled ? "" : "group-hover:text-primary"
                      }`}>
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
                      <span>{dateLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <Clock className="w-4 h-4" />
                      <span>{timeLabel}</span>
                    </div>
                  </div>

                </div>

                <div className="flex items-center gap-2 mt-3 sm:mt-0 shrink-0">
                  {showEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-neutral-200 text-neutral-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingMeeting(meeting);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  )}
                  <div className="text-sm text-neutral-400 font-medium whitespace-nowrap">
                    20 mins
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <EditScheduledMeetingDialog
        meeting={editingMeeting}
        isOpen={editingMeeting != null}
        onClose={() => setEditingMeeting(null)}
        onSaved={onScheduledMeetingUpdated}
      />

    </div >
  );
}