"use client";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckSquare,
  Video,
  Plus,
  MoreHorizontal,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, Milestone, CalendarEvent, TaskStatus } from "@/lib/types";
import { mockCalendarEvents } from "@/lib/mock-data";

interface ProjectCalendarProps {
  tasks: Task[];
  milestones: Milestone[];
}

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Status-based colors
const statusColors: Record<TaskStatus, string> = {
  done: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "in-progress": "bg-blue-100 text-blue-700 border-blue-200",
  todo: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

const meetingColor = "bg-neutral-800 text-white border-neutral-800";
const milestoneColor = "bg-green-50 text-green-700 border-green-200";

export function ProjectCalendar({ tasks, milestones }: ProjectCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 1)); // October 2025
  const [events] = useState<CalendarEvent[]>(mockCalendarEvents);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [showAllEventsDate, setShowAllEventsDate] = useState<string | null>(
    null
  );
  const [filters, setFilters] = useState({
    member: "all",
    type: "all",
    status: "all",
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("default", { month: "long" });

  // Get calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays: {
    date: number;
    month: "prev" | "current" | "next";
    fullDate: string;
  }[] = [];

  // Previous month days
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

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({
      date: i,
      month: "current",
      fullDate: `${year}-${String(month + 1).padStart(2, "0")}-${String(
        i
      ).padStart(2, "0")}`,
    });
  }

  // Next month days
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

  // Get events for a specific date (including multi-day events)
  const getEventsForDate = (fullDate: string) => {
    const dateObj = new Date(fullDate);
    let filteredEvents = events.filter((e) => {
      const startDate = new Date(e.startDate);
      const endDate = e.endDate ? new Date(e.endDate) : startDate;
      return dateObj >= startDate && dateObj <= endDate;
    });

    // Apply type filter
    if (filters.type !== "all") {
      filteredEvents = filteredEvents.filter((e) => e.type === filters.type);
    }

    // Apply status filter
    if (filters.status !== "all") {
      filteredEvents = filteredEvents.filter(
        (e) => e.status === filters.status
      );
    }

    return filteredEvents;
  };

  // Check if event spans multiple days and get position info
  const getEventSpanInfo = (event: CalendarEvent, fullDate: string) => {
    if (!event.endDate)
      return { isSpanning: false, position: "single" as const };

    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    const currentDate = new Date(fullDate);

    const isSpanning = endDate > startDate;
    let position: "start" | "middle" | "end" | "single" = "single";

    if (isSpanning) {
      if (currentDate.getTime() === startDate.getTime()) position = "start";
      else if (currentDate.getTime() === endDate.getTime()) position = "end";
      else position = "middle";
    }

    return { isSpanning, position };
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.type === "meeting") return meetingColor;
    if (event.type === "milestone") return milestoneColor;
    return statusColors[event.status];
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const jumpToToday = () => setCurrentDate(new Date());

  const isToday = (day: { date: number; month: string }) => {
    const today = new Date();
    return (
      day.month === "current" &&
      day.date === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters((prev) => ({ ...prev, [filterType]: value }));
  };

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      {/* Calendar Header */}
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
            className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
            Jump to Today
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <FilterButton
            label="Member"
            value={filters.member}
            options={[
              { value: "all", label: "All Members" },
              { value: "me", label: "Assigned to Me" },
            ]}
            onChange={(v) => handleFilterChange("member", v)}
          />
          <FilterButton
            label="Type"
            value={filters.type}
            options={[
              { value: "all", label: "All Types" },
              { value: "task", label: "Tasks" },
              { value: "milestone", label: "Milestones" },
              { value: "meeting", label: "Meetings" },
              { value: "deadline", label: "Deadlines" },
            ]}
            onChange={(v) => handleFilterChange("type", v)}
          />
          <FilterButton
            label="Status"
            value={filters.status}
            options={[
              { value: "all", label: "All Status" },
              { value: "todo", label: "To Do" },
              { value: "in-progress", label: "In Progress" },
              { value: "done", label: "Done" },
            ]}
            onChange={(v) => handleFilterChange("status", v)}
          />
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Days of week header */}
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

        {/* Calendar days */}
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
                className={cn(
                  "min-h-[100px] p-2 border-r border-b border-neutral-200 transition-colors relative group",
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

                  {/* Plus icon on hover */}
                  {day.month === "current" && isHovered && (
                    <button
                      className="w-6 h-6 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        /* Open create event modal */
                      }}
                    >
                      <Plus className="w-3.5 h-3.5 text-neutral-500" />
                    </button>
                  )}
                </div>

                {/* Events - max 2 visible */}
                <div className="mt-1 space-y-1">
                  {dayEvents
                    .slice(0, showingAllEvents ? dayEvents.length : 2)
                    .map((event) => {
                      const { isSpanning, position } = getEventSpanInfo(
                        event,
                        day.fullDate
                      );
                      const colorClass = getEventColor(event);

                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "text-xs px-2 py-1 truncate flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity border",
                            colorClass,
                            isSpanning &&
                              position === "start" &&
                              "rounded-l-md rounded-r-none -mr-2",
                            isSpanning &&
                              position === "middle" &&
                              "rounded-none -mx-2",
                            isSpanning &&
                              position === "end" &&
                              "rounded-r-md rounded-l-none -ml-2",
                            !isSpanning && "rounded-md"
                          )}
                        >
                          {(position === "start" || position === "single") && (
                            <>
                              {event.type === "milestone" && (
                                <Flag className="w-3 h-3 flex-shrink-0" />
                              )}
                              {event.type === "task" && (
                                <CheckSquare className="w-3 h-3 flex-shrink-0" />
                              )}
                              {event.type === "meeting" && (
                                <Video className="w-3 h-3 flex-shrink-0" />
                              )}
                              {event.type === "deadline" && (
                                <Clock className="w-3 h-3 flex-shrink-0" />
                              )}
                            </>
                          )}
                          {(position === "start" || position === "single") && (
                            <span className="truncate">{event.title}</span>
                          )}
                          {(position === "start" || position === "single") && (
                            <MoreHorizontal className="w-3 h-3 flex-shrink-0 ml-auto" />
                          )}
                        </div>
                      );
                    })}

                  {/* "X more" button */}
                  {dayEvents.length > 2 && !showingAllEvents && (
                    <button
                      onClick={() => setShowAllEventsDate(day.fullDate)}
                      className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                    >
                      {dayEvents.length - 2} more
                    </button>
                  )}

                  {showingAllEvents && dayEvents.length > 2 && (
                    <button
                      onClick={() => setShowAllEventsDate(null)}
                      className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
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
    </div>
  );
}

interface FilterButtonProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function FilterButton({ label, value, options, onChange }: FilterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-sm text-neutral-700 transition-colors"
      >
        {label}
        {value !== "all" && (
          <span className="text-primary">: {selectedOption?.label}</span>
        )}
        <ChevronRight className="w-3 h-3 rotate-90" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm transition-colors",
                  value === option.value
                    ? "bg-primary/10 text-primary"
                    : "text-neutral-700 hover:bg-neutral-50"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
