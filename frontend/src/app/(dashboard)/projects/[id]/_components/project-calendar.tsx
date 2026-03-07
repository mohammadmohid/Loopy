"use client";
import { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckSquare,
  Plus,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, Milestone, CalendarEvent } from "@/lib/types";

interface ProjectCalendarProps {
  tasks: Task[];
  milestones: Milestone[];
  meetings?: any[];
}

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusColors: Record<string, string> = {
  done: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "in-progress": "bg-blue-100 text-blue-700 border-blue-200",
  todo: "bg-neutral-100 text-neutral-600 border-neutral-200",
};
const defaultColor = "bg-neutral-100 text-neutral-600 border-neutral-200";
const milestoneColor = "bg-green-50 text-green-700 border-green-200";

export function ProjectCalendar({ tasks, milestones, meetings = [] }: ProjectCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAllEventsDate, setShowAllEventsDate] = useState<string | null>(
    null
  );
  const [filters, setFilters] = useState({
    member: "all",
    type: "all",
    status: "all",
  });

  const events = useMemo(() => {
    const taskEvents: CalendarEvent[] = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      type: "task",
      status: t.status,
      startDate: t.dueDate || t.createdAt,
      endDate: t.dueDate,
      projectId: t.projectId,
    }));

    const milestoneEvents: CalendarEvent[] = milestones.map((m) => ({
      id: m.id,
      title: m.name,
      type: "milestone",
      status: "in-progress",
      startDate: m.startDate,
      endDate: m.dueDate,
      projectId: m.projectId,
    }));

    const meetingEvents: CalendarEvent[] = meetings.map((m) => ({
      id: m.id || m._id,
      title: m.title,
      type: "meeting" as any,
      status: "in-progress" as any,
      startDate: m.scheduledAt,
      endDate: m.scheduledAt,
      projectId: m.projectId,
    }));

    return [...taskEvents, ...milestoneEvents, ...meetingEvents];
  }, [tasks, milestones, meetings]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays: {
    date: number;
    month: "prev" | "current" | "next";
    fullDate: string;
  }[] = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const date = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 12 : month;
    const prevYear = month === 0 ? year - 1 : year;
    calendarDays.push({
      date,
      month: "prev",
      fullDate: `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(
        date
      ).padStart(2, "0")}`,
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      date: i,
      month: "current",
      fullDate: `${year}-${String(month + 1).padStart(2, "0")}-${String(
        i
      ).padStart(2, "0")}`,
    });
  }

  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    const nextMonth = month === 11 ? 1 : month + 2;
    const nextYear = month === 11 ? year + 1 : year;
    calendarDays.push({
      date: i,
      month: "next",
      fullDate: `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(
        i
      ).padStart(2, "0")}`,
    });
  }

  const getEventsForDate = (fullDate: string) => {
    const dateObj = new Date(fullDate);
    dateObj.setHours(0, 0, 0, 0);

    return events.filter((e) => {
      const startDate = new Date(e.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = e.endDate ? new Date(e.endDate) : startDate;
      endDate.setHours(0, 0, 0, 0);

      return dateObj >= startDate && dateObj <= endDate;
    });
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.type === "milestone") return milestoneColor;
    if (event.type === "meeting" as any) return "bg-[#fbeaec] text-[#cc2233] border-[#fbeaec]";
    return statusColors[event.status] || defaultColor;
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const jumpToToday = () => setCurrentDate(new Date());

  const formatEventTime = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isToday = (day: { date: number; month: string }) => {
    const today = new Date();
    return (
      day.month === "current" &&
      day.date === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-neutral-500" />
            </button>
            <span className="text-primary font-semibold">{monthName}</span>
            <span className="text-neutral-500">{year}</span>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
          <button
            onClick={jumpToToday}
            className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
          >
            <ChevronLeft className="w-3 h-3" /> Jump to Today
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4">
        <div className="grid grid-cols-7 mb-2">
          {daysOfWeek.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-neutral-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 border-t border-l border-neutral-200">
          {calendarDays.map((day, index) => {
            const dayEvents = getEventsForDate(day.fullDate);
            const today = isToday(day);
            const isHovered = hoveredDate === day.fullDate;
            const showingAllEvents = showAllEventsDate === day.fullDate;

            return (
              <div
                key={index}
                onMouseEnter={() =>
                  day.month === "current" && setHoveredDate(day.fullDate)
                }
                onMouseLeave={() => setHoveredDate(null)}
                onClick={() => setSelectedDate(day.fullDate)}
                className={cn(
                  "min-h-[100px] p-2 border-r border-b border-neutral-200 transition-colors relative group cursor-pointer",
                  day.month !== "current"
                    ? "bg-neutral-50"
                    : "hover:bg-neutral-50/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center w-7 h-7 text-sm rounded-full",
                      day.month !== "current"
                        ? "text-neutral-400"
                        : "text-neutral-700",
                      today && "bg-primary text-white font-semibold"
                    )}
                  >
                    {day.date}
                  </span>
                  {day.month === "current" && isHovered && (
                    <button className="w-6 h-6 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 opacity-0 group-hover:opacity-100">
                      <Plus className="w-3.5 h-3.5 text-neutral-500" />
                    </button>
                  )}
                </div>

                <div className="mt-1 space-y-1">
                  {dayEvents
                    .slice(0, showingAllEvents ? dayEvents.length : 2)
                    .map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "text-xs px-2 py-1 truncate flex items-center gap-1 hover:opacity-80 transition-opacity border rounded-md m-0.5",
                          getEventColor(event)
                        )}
                      >
                        {event.type === "milestone" ? (
                          <Flag className="w-3 h-3" />
                        ) : event.type === ("meeting" as any) ? (
                          <Video className="w-3 h-3" />
                        ) : (
                          <CheckSquare className="w-3 h-3" />
                        )}
                        <span className="truncate">{event.title}</span>
                      </div>
                    ))}

                  {dayEvents.length > 2 && !showingAllEvents && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAllEventsDate(day.fullDate);
                      }}
                      className="text-xs text-neutral-500 hover:text-neutral-700"
                    >
                      {dayEvents.length - 2} more
                    </button>
                  )}

                  {showingAllEvents && dayEvents.length > 2 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowAllEventsDate(null);
                      }}
                      className="text-xs text-neutral-500"
                    >
                      Show less
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Popup Dialog for Selected Date */}
      {selectedDate && (() => {
        const dateEvents = getEventsForDate(selectedDate);
        const meetingEvents = dateEvents.filter(e => e.type === "meeting");
        const deadlineEvents = dateEvents.filter(e => e.type !== "meeting");

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedDate(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <h3 className="font-semibold text-neutral-900">
                  {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}
                </h3>
                <button onClick={() => setSelectedDate(null)} className="text-neutral-400 hover:text-neutral-600 font-bold p-1">
                  ✕
                </button>
              </div>
              <div className="p-5 overflow-y-auto space-y-6">

                {/* Meetings Section */}
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                    <Video className="w-4 h-4 text-[#cc2233]" /> Meetings
                  </h4>
                  {meetingEvents.length === 0 ? (
                    <p className="text-sm text-neutral-500 bg-neutral-50 rounded-lg p-3 border border-neutral-100 italic">No meetings for this day.</p>
                  ) : (
                    <div className="space-y-2">
                      {meetingEvents.map((evt) => (
                        <div key={evt.id} className={cn("p-3 rounded-lg border text-sm flex gap-3", getEventColor(evt))}>
                          <div className="mt-0.5 shrink-0">
                            <Video className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{evt.title}</p>
                            <p className="text-xs opacity-80 mt-1 uppercase tracking-wider font-medium">
                              {evt.startDate ? formatEventTime(evt.startDate) : 'No time set'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Deadlines Section */}
                <div>
                  <h4 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                    <Flag className="w-4 h-4 text-emerald-600" /> Deadlines
                  </h4>
                  {deadlineEvents.length === 0 ? (
                    <p className="text-sm text-neutral-500 bg-neutral-50 rounded-lg p-3 border border-neutral-100 italic">No deadlines for this day.</p>
                  ) : (
                    <div className="space-y-2">
                      {deadlineEvents.map((evt) => (
                        <div key={evt.id} className={cn("p-3 rounded-lg border text-sm flex gap-3", getEventColor(evt))}>
                          <div className="mt-0.5 shrink-0">
                            {evt.type === "milestone" ? <Flag className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{evt.title}</p>
                            <p className="text-xs opacity-80 mt-1 uppercase tracking-wider font-medium">
                              {evt.type} • {evt.startDate ? formatEventTime(evt.startDate) : 'No time set'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
