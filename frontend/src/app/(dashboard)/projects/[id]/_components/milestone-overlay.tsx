"use client";

import { useState } from "react";
import {
  X,
  Pencil,
  Upload,
  ChevronDown,
  MoreVertical,
  AlertTriangle,
  CheckSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Milestone, Task, TaskStatus } from "@/lib/types";

interface MilestoneOverlayProps {
  milestone: Milestone | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (milestone: Milestone) => void;
  onDelete: (milestoneId: string) => void;
  onTaskClick: (task: Task) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const statusColors: Record<TaskStatus, { bg: string; text: string }> = {
  done: { bg: "bg-emerald-500", text: "text-white" },
  "in-progress": { bg: "bg-blue-500", text: "text-white" },
  todo: { bg: "bg-neutral-200", text: "text-neutral-700" },
};

const statusLabels: Record<TaskStatus, string> = {
  done: "DONE",
  "in-progress": "IN PROGRESS",
  todo: "TO DO",
};

const statusDotColors: Record<TaskStatus, string> = {
  done: "bg-amber-500",
  "in-progress": "bg-emerald-500",
  todo: "bg-red-500",
};

export function MilestoneOverlay({
  milestone,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onTaskClick,
  onTaskStatusChange,
  canEdit,
  canDelete,
}: MilestoneOverlayProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(milestone?.name || "");

  if (!isOpen || !milestone) return null;

  const handleNameSave = () => {
    if (editedName.trim() && editedName !== milestone.name) {
      onUpdate({ ...milestone, name: editedName });
    }
    setIsEditingName(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNameSave();
                  if (e.key === "Escape") {
                    setEditedName(milestone.name);
                    setIsEditingName(false);
                  }
                }}
                autoFocus
                className="text-lg font-semibold text-neutral-900 bg-transparent border-b-2 border-primary focus:outline-none"
              />
            ) : (
              <>
                <h2 className="text-lg font-semibold text-neutral-900">
                  {milestone.name}
                </h2>
                {canEdit && (
                  <button
                    onClick={() => {
                      setEditedName(milestone.name);
                      setIsEditingName(true);
                    }}
                    className="p-1 hover:bg-neutral-100 rounded transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-neutral-400" />
                  </button>
                )}
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Description */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-1 block">
              Description
            </label>
            <p className="text-neutral-600 text-sm">
              {milestone.description || "Add a description..."}
            </p>
          </div>

          {/* Assignee */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-1 block">
              Assignees
            </label>
            <div className="flex flex-wrap gap-2">
              {milestone.assignees && milestone.assignees.length > 0 ? (
                milestone.assignees.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-2 bg-neutral-50 px-2 py-1 rounded-lg border border-neutral-100"
                  >
                    <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center text-xs font-medium">
                      {u.avatar}
                    </div>
                    <span className="text-sm text-neutral-900">{u.name}</span>
                  </div>
                ))
              ) : (
                <span className="text-sm text-neutral-400">No assignees</span>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-1 block">
              Attachments
            </label>
            <button className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
              <Upload className="w-4 h-4" />
              Click to upload
            </button>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-500 mb-1 block">
                Start Date
              </label>
              <p className="text-sm text-neutral-900">
                {formatDate(milestone.startDate)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-500 mb-1 block">
                Due date
              </label>
              <p className="text-sm text-neutral-900">
                {formatDate(milestone.dueDate)}
              </p>
            </div>
          </div>

          {/* Team */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-1 block">
              Team
            </label>
            <p className="text-sm text-neutral-500">
              {milestone.team || "Add a team"}
            </p>
          </div>

          {/* Tasks */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-3 block">
              Tasks
            </label>
            <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100">
              {milestone.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onStatusChange={(status) =>
                    onTaskStatusChange(task.id, status)
                  }
                  isOverdue={isOverdue(task.dueDate)}
                />
              ))}
              {milestone.tasks.length === 0 && (
                <div className="p-4 text-center text-neutral-500 text-sm">
                  No tasks in this milestone
                </div>
              )}
            </div>
          </div>

          {/* Delete Button */}
          {canDelete && (
            <div className="pt-4 border-t border-neutral-200">
              <button
                onClick={() => {
                  onDelete(milestone.id);
                  onClose();
                }}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Delete Milestone
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  onClick: () => void;
  onStatusChange: (status: TaskStatus) => void;
  isOverdue: boolean;
}

function TaskRow({ task, onClick, onStatusChange, isOverdue }: TaskRowProps) {
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  return (
    <div className="flex items-center px-4 py-3 hover:bg-neutral-50 transition-colors group">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStatusChange(task.status === "done" ? "todo" : "done");
        }}
        className="mr-3"
      >
        <div
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
            task.status === "done"
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-neutral-300 hover:border-neutral-400"
          )}
        >
          {task.status === "done" && <CheckSquare className="w-3 h-3" />}
        </div>
      </button>

      <div
        className="flex items-center gap-2 flex-1 cursor-pointer"
        onClick={onClick}
      >
        <span className="text-sm text-neutral-500">{task.id}</span>
        <span
          className={cn(
            "text-sm font-medium",
            task.status === "done" && "line-through text-neutral-400"
          )}
        >
          {task.title}
        </span>
      </div>

      {/* Status Dropdown */}
      <div className="relative mr-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsStatusOpen(!isStatusOpen);
          }}
          className={cn(
            "px-3 py-1 rounded text-xs font-medium flex items-center gap-1",
            statusColors[task.status].bg,
            statusColors[task.status].text
          )}
        >
          {statusLabels[task.status]}
          <ChevronDown className="w-3 h-3" />
        </button>

        {isStatusOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsStatusOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-20">
              {(["todo", "in-progress", "done"] as TaskStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(status);
                      setIsStatusOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs font-medium transition-colors",
                      task.status === status
                        ? "bg-neutral-100"
                        : "hover:bg-neutral-50"
                    )}
                  >
                    {statusLabels[status]}
                  </button>
                )
              )}
            </div>
          </>
        )}
      </div>

      {/* Due Date */}
      {task.dueDate && (
        <div
          className={cn(
            "flex items-center gap-1 text-xs mr-4",
            isOverdue ? "text-red-500" : "text-neutral-500"
          )}
        >
          {isOverdue && <AlertTriangle className="w-3 h-3" />}
          <span>
            {new Date(task.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      )}

      {/* Status Dot */}
      <div
        className={cn(
          "w-2.5 h-2.5 rounded-full mr-3",
          statusDotColors[task.status]
        )}
      />

      {/* Actions */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="p-1.5 hover:bg-neutral-200 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
      >
        <MoreVertical className="w-4 h-4 text-neutral-500" />
      </button>

      {/* Assignee */}
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
  );
}
