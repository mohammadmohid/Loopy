"use client";

import { useState, useRef } from "react";
import {
  Search,
  ChevronDown,
  MoreVertical,
  Plus,
  CheckSquare,
  Bug,
  Lightbulb,
  BookOpen,
  AlertTriangle,
  Calendar as CalendarIcon,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MilestoneOverlay } from "./milestone-overlay";
import { Button } from "@/components/ui/button";
import type { Task, Milestone, TaskStatus, TaskType } from "@/lib/types";

interface TasksMilestonesTabProps {
  tasks: Task[];
  milestones: Milestone[];
  onTaskClick: (task: Task) => void;
  onTaskCreate: (task: Partial<Task>) => void;
  onTaskUpdate: (task: Task) => void;
  onTaskDelete: (taskId: string) => void;
  onMilestoneCreate: (milestone: Partial<Milestone>) => void;
  onMilestoneUpdate: (milestone: Milestone) => void;
  onMilestoneDelete: (milestoneId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const typeIcons: Record<string, any> = {
  task: CheckSquare,
  bug: Bug,
  feature: Lightbulb,
  story: BookOpen,
};

// ... JSON Import Helper ...
const validateAndParseJSON = (jsonString: string): any => {
  try {
    const data = JSON.parse(jsonString);
    // Basic schema check
    if (Array.isArray(data) || (data.tasks && Array.isArray(data.tasks))) {
      return data;
    }
    throw new Error("Invalid format");
  } catch (e) {
    return null;
  }
};

export function TasksMilestonesTab({
  tasks,
  milestones,
  onTaskClick,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  onMilestoneCreate,
  onMilestoneUpdate,
  onMilestoneDelete,
  canEdit,
}: TasksMilestonesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMilestones, setExpandedMilestones] = useState<string[]>(
    milestones.map((m) => m.id)
  );

  // Inline Creation State
  const [creatingTaskIn, setCreatingTaskIn] = useState<
    string | "unassigned" | null
  >(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<TaskType>("task");

  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null
  );
  const [isMilestoneOverlayOpen, setIsMilestoneOverlayOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const unassignedTasks = tasks.filter((t) => !t.milestoneId);

  // JSON Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const data = validateAndParseJSON(content);
      if (data) {
        const tasksToImport = Array.isArray(data) ? data : data.tasks;
        tasksToImport.forEach((t: any) => {
          onTaskCreate({
            title: t.title || "Imported Task",
            status: "todo",
            type: t.type || "task",
            priority: t.priority || "medium",
          });
        });
        alert(`Imported ${tasksToImport.length} tasks`);
      } else {
        alert("Invalid JSON format");
      }
    };
    reader.readAsText(file);
  };

  const handleCreateMilestone = () => {
    // Logic: Start = today, End = max of unassigned tasks (mock logic for now)
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);

    onMilestoneCreate({
      name: "New Milestone",
      startDate: today.toISOString(),
      dueDate: nextMonth.toISOString(),
    });
  };

  const submitCreateTask = (milestoneId?: string) => {
    if (!newTaskTitle.trim()) {
      setCreatingTaskIn(null);
      return;
    }
    onTaskCreate({
      title: newTaskTitle,
      type: newTaskType,
      milestoneId: milestoneId,
      status: "todo",
      priority: "medium",
      dueDate: new Date().toISOString(), // Default due today
    });
    setNewTaskTitle("");
    setCreatingTaskIn(null); // Reset
  };

  const toggleMilestone = (id: string) => {
    setExpandedMilestones((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-neutral-200">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search Tasks & Milestones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="w-4 h-4" /> Import JSON
            </Button>
            {canEdit && (
              <button
                onClick={handleCreateMilestone}
                className="px-4 py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Create Milestone
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Milestones Sections */}
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm"
            >
              <div className="flex items-center justify-between p-4 bg-neutral-50 border-b border-neutral-200">
                <div
                  className="flex items-center gap-3 cursor-pointer select-none"
                  onClick={() => toggleMilestone(milestone.id)}
                >
                  <div
                    className={`p-1 rounded-md transition-transform duration-200 ${
                      !expandedMilestones.includes(milestone.id)
                        ? "-rotate-90"
                        : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4 text-neutral-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-neutral-900">
                        {milestone.name}
                      </span>
                      <span className="text-xs text-neutral-500">
                        ({milestone.tasks?.length})
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {new Date(milestone.startDate).toLocaleDateString()} -{" "}
                      {new Date(milestone.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Actions */}
                  <button
                    onClick={() => {
                      setSelectedMilestone(milestone);
                      setIsMilestoneOverlayOpen(true);
                    }}
                    className="p-2 hover:bg-neutral-200 rounded-lg text-neutral-500"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedMilestones.includes(milestone.id) && (
                <div className="divide-y divide-neutral-100">
                  {milestone.tasks?.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick(task)}
                      onUpdate={onTaskUpdate}
                      onDelete={onTaskDelete}
                    />
                  ))}

                  {/* Inline Creation */}
                  {creatingTaskIn === milestone.id ? (
                    <InlineCreateRow
                      title={newTaskTitle}
                      setTitle={setNewTaskTitle}
                      type={newTaskType}
                      setType={setNewTaskType}
                      onCancel={() => setCreatingTaskIn(null)}
                      onSubmit={() => submitCreateTask(milestone.id)}
                    />
                  ) : (
                    <div
                      onClick={() => setCreatingTaskIn(milestone.id)}
                      className="flex items-center gap-3 p-3 pl-12 text-sm text-neutral-500 hover:bg-neutral-50 cursor-pointer transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Create
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Unassigned Tasks Section */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="p-4 bg-neutral-50 border-b border-neutral-200">
              <span className="font-semibold text-neutral-900">
                Unassigned Tasks
              </span>
            </div>
            <div className="divide-y divide-neutral-100">
              {unassignedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onUpdate={onTaskUpdate}
                  onDelete={onTaskDelete}
                />
              ))}

              {creatingTaskIn === "unassigned" ? (
                <InlineCreateRow
                  title={newTaskTitle}
                  setTitle={setNewTaskTitle}
                  type={newTaskType}
                  setType={setNewTaskType}
                  onCancel={() => setCreatingTaskIn(null)}
                  onSubmit={() => submitCreateTask()}
                />
              ) : (
                <div
                  onClick={() => setCreatingTaskIn("unassigned")}
                  className="flex items-center gap-3 p-3 pl-12 text-sm text-neutral-500 hover:bg-neutral-50 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" /> Create
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <MilestoneOverlay
        milestone={selectedMilestone}
        isOpen={isMilestoneOverlayOpen}
        onClose={() => setIsMilestoneOverlayOpen(false)}
        onUpdate={onMilestoneUpdate}
        onDelete={onMilestoneDelete}
        onTaskClick={onTaskClick}
        onTaskStatusChange={(tid, status) => {
          /* logic */
        }}
        canEdit={canEdit}
        canDelete={true} // Allow deletion for milestones
      />
    </>
  );
}

// Sub-components

function InlineCreateRow({
  title,
  setTitle,
  type,
  setType,
  onCancel,
  onSubmit,
}: any) {
  const TypeIcon = typeIcons[type];

  return (
    <div className="flex items-center gap-3 p-3 pl-4 animate-in fade-in bg-blue-50/50">
      <div className="relative">
        <button className="p-1 hover:bg-neutral-200 rounded">
          <TypeIcon className="w-4 h-4 text-neutral-600" />
        </button>
        {/* Simplified Type Dropdown could go here */}
      </div>
      <input
        autoFocus
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
        placeholder="Type task title and press Enter..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
          if (e.key === "Escape") onCancel();
        }}
      />
    </div>
  );
}

function TaskRow({
  task,
  onClick,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onClick: () => void;
  onUpdate: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = typeIcons[task.type] || CheckSquare;
  const isDone = task.status === "done";

  // Status Colors
  const statusColors: any = {
    done: "bg-emerald-100 text-emerald-700 border-emerald-200",
    "in-progress": "bg-blue-100 text-blue-700 border-blue-200",
    todo: "bg-neutral-100 text-neutral-700 border-neutral-200",
  };

  // Priority Colors
  const priorityColor =
    {
      high: "bg-red-500",
      medium: "bg-amber-500",
      low: "bg-emerald-500",
    }[task.priority] || "bg-neutral-400";

  // Due Date Check
  const now = new Date();
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < now && !isDone;
  const isClose =
    dueDate &&
    dueDate > now &&
    dueDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000 &&
    !isDone; // 3 days

  return (
    <div
      className="flex items-center p-3 pl-4 hover:bg-neutral-50 group cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 w-10">
        <input
          type="checkbox"
          checked={isDone}
          onChange={(e) => {
            e.stopPropagation();
            onUpdate({ ...task, status: isDone ? "todo" : "done" });
          }}
          className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary"
        />
      </div>

      <div className="w-20 text-xs text-neutral-400 font-mono">
        ID-{task.id.slice(-4)}
      </div>

      <div className="flex-1 flex items-center gap-2">
        <span
          className={cn(
            "text-sm text-neutral-900 font-medium",
            isDone && "line-through text-neutral-400"
          )}
        >
          {task.title}
        </span>
      </div>

      {/* Right Actions & Meta */}
      <div className="flex items-center gap-4">
        {/* Status Pill */}
        <span
          className={cn(
            "px-2 py-0.5 rounded text-[10px] font-semibold border uppercase",
            statusColors[task.status] || statusColors.todo
          )}
        >
          {task.status.replace("-", " ")}
        </span>

        {/* Due Date Warning */}
        {(isOverdue || isClose) && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs border px-2 py-0.5 rounded bg-white",
              isOverdue
                ? "text-red-600 border-red-200"
                : "text-amber-600 border-amber-200"
            )}
          >
            <AlertTriangle className="w-3 h-3" />
            {dueDate?.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </div>
        )}

        {/* Priority Dot */}
        <div
          className={cn("w-2.5 h-2.5 rounded-full", priorityColor)}
          title={`Priority: ${task.priority}`}
        />

        {/* Menu */}
        <button
          className="p-1 hover:bg-neutral-200 rounded text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            // Just for demo, usually opens a popover
            if (confirm("Delete task?")) onDelete(task.id);
          }}
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {/* Assignee Avatar */}
        <div className="flex items-center -space-x-1.5 min-w-12 justify-end">
          {task.assignees && task.assignees.length > 0 ? (
            <>
              <div
                className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm"
                title={task.assignees[0].name}
              >
                {task.assignees[0].avatar || "U"}
              </div>
              {task.assignees.length > 1 && (
                <div className="w-7 h-7 rounded-full bg-neutral-800 text-white flex items-center justify-center text-[9px] font-bold border-2 border-white shadow-sm">
                  +{task.assignees.length - 1}
                </div>
              )}
            </>
          ) : (
            <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-[9px] border-2 border-white">
              UN
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
