"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  CheckSquare,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, Milestone, TaskStatus } from "@/lib/types";

interface TimelineTabProps {
  milestones: Milestone[];
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onMilestoneUpdate: (milestone: Milestone) => void;
  onMilestoneDelete: (milestoneId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

type ViewMode = "Month" | "Weekly" | "Monthly" | "Yearly";

const statusBadgeColors: Record<TaskStatus, string> = {
  done: "bg-emerald-100 text-emerald-700",
  "in-progress": "bg-blue-100 text-blue-700",
  todo: "bg-neutral-100 text-neutral-700",
};

const statusLabels: Record<TaskStatus, string> = {
  done: "DONE",
  "in-progress": "In Progress",
  todo: "To Do",
};

export function TimelineTab({
  milestones,
  tasks,
  onTaskClick,
  onMilestoneUpdate,
  onMilestoneDelete,
  canEdit,
  canDelete,
}: TimelineTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("Month");
  const [viewModeOpen, setViewModeOpen] = useState(false);
  const [expandedMilestones, setExpandedMilestones] = useState<string[]>([
    milestones[0]?.id || "",
  ]);
  const [currentDate, setCurrentDate] = useState(new Date(2025, 9, 14)); // Oct 14, 2025
  const [filters, setFilters] = useState({
    assignee: "all",
    type: "all",
    status: "all",
  });

  // Generate month columns for the timeline
  const monthColumns = useMemo(() => {
    const months: { name: string; year: number; weeks: number[] }[] = [];
    const startMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    );

    for (let i = 0; i < 4; i++) {
      const month = new Date(
        startMonth.getFullYear(),
        startMonth.getMonth() + i,
        1
      );
      const daysInMonth = new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        0
      ).getDate();
      const weeks: number[] = [];

      for (let w = 1; w <= daysInMonth; w += 7) {
        weeks.push(w);
      }

      months.push({
        name: month
          .toLocaleDateString("en-US", { month: "short" })
          .toUpperCase(),
        year: month.getFullYear(),
        weeks,
      });
    }

    return months;
  }, [currentDate]);

  const toggleMilestone = (milestoneId: string) => {
    setExpandedMilestones((prev) =>
      prev.includes(milestoneId)
        ? prev.filter((id) => id !== milestoneId)
        : [...prev, milestoneId]
    );
  };

  const jumpToToday = () => setCurrentDate(new Date());
  const prevPeriod = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  const nextPeriod = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );

  // Calculate bar position and width for Gantt chart
  const getBarStyle = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timelineStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    );
    const timelineEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 3,
      0
    );
    const totalDays =
      (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);

    const startOffset = Math.max(
      0,
      (start.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const duration = Math.min(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1,
      totalDays - startOffset
    );

    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = (duration / totalDays) * 100;

    return {
      left: `${Math.max(0, leftPercent)}%`,
      width: `${Math.min(100 - leftPercent, widthPercent)}%`,
    };
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} - ${endDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })}`;
  };

  // Get today's position
  const getTodayPosition = () => {
    const today = new Date();
    const timelineStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    );
    const timelineEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 3,
      0
    );
    const totalDays =
      (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    const todayOffset =
      (today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);

    if (todayOffset < 0 || todayOffset > totalDays) return null;
    return `${(todayOffset / totalDays) * 100}%`;
  };

  const todayPosition = getTodayPosition();

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FilterDropdown
            label="Assignee"
            value={filters.assignee}
            options={[
              { value: "all", label: "All Assignees" },
              { value: "me", label: "Assigned to Me" },
            ]}
            onChange={(v) => setFilters((prev) => ({ ...prev, assignee: v }))}
          />
          <FilterDropdown
            label="Type"
            value={filters.type}
            options={[
              { value: "all", label: "All Types" },
              { value: "task", label: "Task" },
              { value: "milestone", label: "Milestone" },
            ]}
            onChange={(v) => setFilters((prev) => ({ ...prev, type: v }))}
          />
          <FilterDropdown
            label="Status"
            value={filters.status}
            options={[
              { value: "all", label: "All Status" },
              { value: "todo", label: "To Do" },
              { value: "in-progress", label: "In Progress" },
              { value: "done", label: "Done" },
            ]}
            onChange={(v) => setFilters((prev) => ({ ...prev, status: v }))}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={jumpToToday}
            className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
            Jump to Today
          </button>
        </div>
      </div>

      {/* Timeline Header */}
      <div className="border border-neutral-200 rounded-xl overflow-hidden">
        <div className="flex">
          {/* Task column header */}
          <div className="w-80 shrink-0 border-r border-neutral-200 bg-neutral-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700">Task</span>
              <div className="relative">
                <button
                  onClick={() => setViewModeOpen(!viewModeOpen)}
                  className="flex items-center gap-1 px-2 py-1 border border-neutral-200 rounded-lg text-sm hover:bg-neutral-100 transition-colors"
                >
                  <span className="text-neutral-500">📅</span>
                  {viewMode}
                  <ChevronDown className="w-3 h-3 text-neutral-400" />
                </button>

                {viewModeOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setViewModeOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-28 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-20">
                      {(["Weekly", "Monthly", "Yearly"] as ViewMode[]).map(
                        (mode) => (
                          <button
                            key={mode}
                            onClick={() => {
                              setViewMode(mode);
                              setViewModeOpen(false);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 text-sm transition-colors",
                              viewMode === mode
                                ? "bg-neutral-100"
                                : "hover:bg-neutral-50"
                            )}
                          >
                            {mode}
                          </button>
                        )
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Month columns */}
          <div className="flex-1 flex">
            {monthColumns.map((month, idx) => (
              <div
                key={idx}
                className="flex-1 border-r border-neutral-200 last:border-r-0"
              >
                <div className="bg-neutral-50 border-b border-neutral-200 px-2 py-2 text-center">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      month.name === "OCT" ? "text-primary" : "text-neutral-500"
                    )}
                  >
                    {month.name}
                  </span>
                </div>
                <div className="flex border-b border-neutral-200">
                  {month.weeks.map((week) => (
                    <div
                      key={week}
                      className="flex-1 text-center py-1 text-xs text-neutral-400"
                    >
                      {week}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Body */}
        <div className="relative">
          {/* Today line */}
          {todayPosition && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-500 z-10"
              style={{
                left: `calc(320px + (100% - 320px) * ${
                  Number.parseFloat(todayPosition) / 100
                })`,
              }}
            />
          )}

          {milestones.map((milestone) => {
            const milestoneTasks = tasks.filter(
              (t) => t.milestoneId === milestone.id
            );
            const isExpanded = expandedMilestones.includes(milestone.id);

            return (
              <div key={milestone.id}>
                {/* Milestone Row */}
                <div className="flex border-b border-neutral-200 hover:bg-neutral-50 transition-colors">
                  <div className="w-80 shrink-0 border-r border-neutral-200 p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleMilestone(milestone.id)}>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-neutral-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-neutral-500" />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-neutral-900">
                            Milestone {milestones.indexOf(milestone) + 1}:{" "}
                            {milestone.name}
                          </span>
                          <button className="p-0.5 hover:bg-neutral-200 rounded transition-colors">
                            <MoreVertical className="w-4 h-4 text-neutral-400" />
                          </button>
                        </div>
                        <span className="text-xs text-primary">
                          {formatDateRange(
                            milestone.startDate,
                            milestone.dueDate
                          )}
                        </span>
                        <span className="text-xs text-neutral-400 ml-2">
                          {milestoneTasks.length} tasks
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Gantt bar */}
                  <div className="flex-1 relative h-16">
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-6 bg-green-100 border border-green-300 rounded flex items-center"
                      style={getBarStyle(
                        milestone.startDate,
                        milestone.dueDate
                      )}
                    >
                      <div className="w-1 h-full bg-green-500 rounded-l" />
                      <div className="w-1 h-full bg-green-500 rounded-r absolute right-0" />
                    </div>
                  </div>
                </div>

                {/* Task Rows */}
                {isExpanded &&
                  milestoneTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                    >
                      <div className="w-80 shrink-0 border-r border-neutral-200 p-3 pl-10">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-neutral-400" />
                          <span
                            className={cn(
                              "text-sm",
                              task.status === "done" &&
                                "line-through text-neutral-400"
                            )}
                          >
                            {task.title}
                          </span>
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded",
                              statusBadgeColors[task.status]
                            )}
                          >
                            {statusLabels[task.status]}
                          </span>
                          <div className="flex items-center -space-x-1 ml-2">
                            {task.assignees && task.assignees.length > 0 ? (
                              <>
                                <div className="w-7 h-7 bg-neutral-200 rounded-full flex items-center justify-center text-[10px] font-medium text-neutral-600 border border-white">
                                  {task.assignees[0].avatar || "U"}
                                </div>
                                {task.assignees.length > 1 && (
                                  <div className="w-7 h-7 bg-neutral-800 text-white rounded-full flex items-center justify-center text-[9px] font-medium border border-white">
                                    +{task.assignees.length - 1}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-7 h-7 bg-neutral-100 rounded-full flex items-center justify-center text-[10px] border border-white">
                                U
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Task Gantt bar */}
                      <div className="flex-1 relative h-12">
                        {task.dueDate && (
                          <div
                            className={cn(
                              "absolute top-1/2 -translate-y-1/2 h-5 rounded flex items-center px-2",
                              task.status === "done"
                                ? "bg-emerald-100 border border-emerald-300"
                                : task.status === "in-progress"
                                ? "bg-blue-100 border border-blue-300"
                                : "bg-neutral-100 border border-neutral-300"
                            )}
                            style={getBarStyle(task.createdAt, task.dueDate)}
                          >
                            {task.status !== "done" && (
                              <Link2 className="w-3 h-3 text-neutral-400 ml-auto" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface FilterDropdownProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 border border-neutral-200 rounded-xl text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
      >
        {label}
        <ChevronDown className="w-4 h-4 text-neutral-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-neutral-200 rounded-xl shadow-lg py-1 z-20">
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
