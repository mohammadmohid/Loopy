"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  MoreVertical,
  Plus,
  CheckSquare,
  Bug,
  Lightbulb,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MilestoneOverlay } from "./milestone-overlay";
import type { Task, Milestone, TaskStatus, TaskType } from "@/lib/types";

interface TasksMilestonesTabProps {
  tasks: Task[];
  milestones: Milestone[];
  onTaskClick: (task: Task) => void;
  onTaskCreate: (task: Partial<Task>) => void;
  onTaskUpdate: (task: Task) => void;
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

export function TasksMilestonesTab({
  tasks,
  milestones,
  onTaskClick,
  onTaskCreate,
  onTaskUpdate,
  onMilestoneCreate,
  onMilestoneUpdate,
  onMilestoneDelete,
  canEdit,
  canDelete,
}: TasksMilestonesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  // Default to expanding all milestones initially
  const [expandedMilestones, setExpandedMilestones] = useState<string[]>(
    milestones.map((m) => m.id)
  );
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<TaskType>("task");
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null
  );
  const [isMilestoneOverlayOpen, setIsMilestoneOverlayOpen] = useState(false);

  const unassignedTasks = tasks.filter((t) => !t.milestoneId);

  const toggleMilestone = (id: string) => {
    setExpandedMilestones((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleCreateTask = (milestoneId?: string) => {
    if (!newTaskTitle.trim()) return;
    onTaskCreate({
      title: newTaskTitle,
      type: newTaskType,
      status: "todo",
      priority: "medium",
      milestoneId,
    });
    setNewTaskTitle("");
    setIsCreatingTask(false);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Search */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search Tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-xl text-sm outline-none focus:border-primary"
            />
          </div>
          {canEdit && (
            <button
              onClick={() =>
                onMilestoneCreate({
                  name: "New Milestone",
                  startDate: new Date().toISOString(),
                  dueDate: new Date().toISOString(),
                })
              }
              className="px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800"
            >
              Add Milestone
            </button>
          )}
        </div>

        {/* Milestones List */}
        <div className="space-y-4">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="border border-neutral-200 rounded-xl overflow-hidden bg-white"
            >
              <div className="flex items-center justify-between p-3 bg-neutral-50 border-b border-neutral-200">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => toggleMilestone(milestone.id)}
                >
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      !expandedMilestones.includes(milestone.id) && "-rotate-90"
                    )}
                  />
                  <span className="font-medium text-sm">{milestone.name}</span>
                  <span className="text-xs text-neutral-500">
                    ({milestone.tasks?.length || 0})
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedMilestone(milestone);
                    setIsMilestoneOverlayOpen(true);
                  }}
                >
                  <MoreVertical className="w-4 h-4 text-neutral-400 hover:text-neutral-600" />
                </button>
              </div>

              {expandedMilestones.includes(milestone.id) && (
                <div className="divide-y divide-neutral-100">
                  {milestone.tasks?.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick(task)}
                      onStatusToggle={() =>
                        onTaskUpdate({
                          ...task,
                          status: task.status === "done" ? "todo" : "done",
                        })
                      }
                    />
                  ))}
                  {/* Milestone-specific task creation could go here */}
                </div>
              )}
            </div>
          ))}

          {/* Unassigned Tasks */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white">
            <div className="p-3 bg-neutral-50 border-b border-neutral-200 flex items-center gap-2">
              <span className="font-medium text-sm">Unassigned Tasks</span>
              <span className="text-xs text-neutral-500">
                ({unassignedTasks.length})
              </span>
            </div>
            <div className="divide-y divide-neutral-100">
              {unassignedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onStatusToggle={() =>
                    onTaskUpdate({
                      ...task,
                      status: task.status === "done" ? "todo" : "done",
                    })
                  }
                />
              ))}

              {canEdit && (
                <div className="p-3">
                  {isCreatingTask ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        className="flex-1 px-3 py-1.5 border rounded-lg text-sm"
                        placeholder="Task title..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleCreateTask()
                        }
                        onBlur={() => setIsCreatingTask(false)}
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsCreatingTask(true)}
                      className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900"
                    >
                      <Plus className="w-4 h-4" /> Add Task
                    </button>
                  )}
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
          /* handle specific task status */
        }}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}

function TaskRow({
  task,
  onClick,
  onStatusToggle,
}: {
  task: Task;
  onClick: () => void;
  onStatusToggle: () => void;
}) {
  const Icon = typeIcons[task.type] || CheckSquare;
  return (
    <div
      className="flex items-center p-3 hover:bg-neutral-50 group cursor-pointer"
      onClick={onClick}
    >
      <button
        className={cn(
          "w-5 h-5 rounded border mr-3 flex items-center justify-center transition-colors",
          task.status === "done"
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "border-neutral-300 hover:border-neutral-400"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onStatusToggle();
        }}
      >
        {task.status === "done" && <CheckSquare className="w-3.5 h-3.5" />}
      </button>
      <div className="flex-1 flex items-center gap-2">
        <Icon className="w-4 h-4 text-neutral-400" />
        <span
          className={cn(
            "text-sm",
            task.status === "done" && "line-through text-neutral-400"
          )}
        >
          {task.title}
        </span>
      </div>
      <div className="text-xs px-2 py-0.5 bg-neutral-100 rounded text-neutral-600 capitalize">
        {task.status.replace("-", " ")}
      </div>
    </div>
  );
}
