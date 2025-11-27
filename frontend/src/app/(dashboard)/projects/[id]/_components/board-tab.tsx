"use client";

import type React from "react";

import { useState } from "react";
import { Plus, MoreVertical, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/lib/types";

interface BoardTabProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
  canEdit: boolean;
}

const columns: { id: TaskStatus; label: string; color: string }[] = [
  { id: "todo", label: "To Do", color: "bg-neutral-200" },
  { id: "in-progress", label: "In Progress", color: "bg-blue-500" },
  { id: "done", label: "Done", color: "bg-emerald-500" },
];

const priorityColors = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-emerald-100 text-emerald-700",
};

export function BoardTab({
  tasks,
  onTaskClick,
  onTaskUpdate,
  canEdit,
}: BoardTabProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  const handleDragStart = (task: Task) => {
    if (!canEdit) return;
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (status: TaskStatus) => {
    if (!draggedTask || !canEdit) return;
    if (draggedTask.status !== status) {
      onTaskUpdate({ ...draggedTask, status });
    }
    setDraggedTask(null);
  };

  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-end gap-2">
        {canEdit && (
          <>
            <button className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
              Edit Columns
            </button>
            <button className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Add Column
            </button>
          </>
        )}
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-4">
        {columns.map((column) => (
          <div
            key={column.id}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
            className="bg-neutral-50 rounded-xl p-4 min-h-[500px]"
          >
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className={cn("w-3 h-3 rounded-full", column.color)} />
              <span className="font-medium text-neutral-900">
                {column.label}
              </span>
              <span className="text-sm text-neutral-500">
                ({getTasksByStatus(column.id).length})
              </span>
            </div>

            {/* Tasks */}
            <div className="space-y-3">
              {getTasksByStatus(column.id).map((task) => (
                <div
                  key={task.id}
                  draggable={canEdit}
                  onDragStart={() => handleDragStart(task)}
                  onClick={() => onTaskClick(task)}
                  className={cn(
                    "bg-white border border-neutral-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-all",
                    canEdit && "cursor-grab active:cursor-grabbing",
                    draggedTask?.id === task.id && "opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-neutral-900 text-sm">
                      {task.title}
                    </span>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 hover:bg-neutral-100 rounded transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-neutral-400" />
                    </button>
                  </div>

                  <p className="text-xs text-neutral-500 mb-2">
                    {task.milestoneId
                      ? "Milestone Name"
                      : "No Milestone Assigned"}
                  </p>

                  {task.description && (
                    <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Priority */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded",
                        priorityColors[task.priority]
                      )}
                    >
                      {task.priority.charAt(0).toUpperCase() +
                        task.priority.slice(1)}
                    </span>

                    <div className="flex items-center gap-2">
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-xs text-neutral-500">
                          <Calendar className="w-3 h-3" />
                          Due: {formatDate(task.dueDate)}
                        </div>
                      )}
                      <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center text-[10px] font-medium">
                        {task.assignee?.avatar || "MM"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Task Button */}
              {canEdit && (
                <button className="w-full p-3 border-2 border-dashed border-neutral-200 rounded-xl text-sm text-neutral-500 hover:border-neutral-300 hover:text-neutral-600 transition-colors flex items-center justify-center gap-1">
                  <Plus className="w-4 h-4" />
                  Add Task
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
