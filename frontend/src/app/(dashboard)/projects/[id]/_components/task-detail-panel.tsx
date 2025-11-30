"use client";

import { useState } from "react";
import { X, Upload, ChevronDown, Smile, Send, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Task, TaskStatus } from "@/lib/types";

interface TaskDetailPanelProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
}

const statusOptions: {
  value: TaskStatus;
  label: string;
  bg: string;
  text: string;
}[] = [
  {
    value: "todo",
    label: "TO DO",
    bg: "bg-neutral-200",
    text: "text-neutral-700",
  },
  {
    value: "in-progress",
    label: "IN PROGRESS",
    bg: "bg-blue-500",
    text: "text-white",
  },
  { value: "done", label: "DONE", bg: "bg-emerald-500", text: "text-white" },
];

const mockComments = [
  {
    id: 1,
    user: "Sarah Wilson",
    avatar: "SW",
    text: "A comment",
    time: "1 day ago",
  },
  {
    id: 2,
    user: "Automated",
    text: "Sarah Wilson created this task",
    time: "3 days ago",
  },
];

export function TaskDetailPanel({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  canEdit,
  canDelete,
}: TaskDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<"All" | "Comments" | "History">(
    "All"
  );
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  if (!isOpen || !task) return null;

  const currentStatus = statusOptions.find((s) => s.value === task.status);

  const handleStatusChange = (status: TaskStatus) => {
    onUpdate({ ...task, status });
    setIsStatusOpen(false);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Not set";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white border-l border-neutral-200 shadow-xl z-50 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-neutral-200">
        <button
          onClick={onClose}
          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-neutral-500" />
        </button>
        <span className="text-sm text-neutral-500">{task.id}</span>
      </div>

      {/* Content */}
      <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div>
            <input
              type="text"
              value={editedTitle || task.title}
              onChange={(e) => setEditedTitle(e.target.value)}
              onBlur={() => {
                if (editedTitle && editedTitle !== task.title) {
                  onUpdate({ ...task, title: editedTitle });
                }
              }}
              disabled={!canEdit}
              className="w-full text-xl font-semibold text-neutral-900 bg-transparent border-none focus:outline-none focus:ring-0 disabled:opacity-100"
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-2 block">
              Status
            </label>
            <div className="relative">
              <button
                onClick={() => canEdit && setIsStatusOpen(!isStatusOpen)}
                disabled={!canEdit}
                className={cn(
                  "px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1",
                  currentStatus?.bg,
                  currentStatus?.text,
                  !canEdit && "opacity-75 cursor-not-allowed"
                )}
              >
                {currentStatus?.label}
                {canEdit && <ChevronDown className="w-3 h-3" />}
              </button>

              {isStatusOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsStatusOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-20">
                    {statusOptions.map((status) => (
                      <button
                        key={status.value}
                        onClick={() => handleStatusChange(status.value)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs font-medium transition-colors",
                          task.status === status.value
                            ? "bg-neutral-100"
                            : "hover:bg-neutral-50"
                        )}
                      >
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded",
                            status.bg,
                            status.text
                          )}
                        >
                          {status.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-2 block">
              Description
            </label>
            <textarea
              value={editedDescription || task.description || ""}
              onChange={(e) => setEditedDescription(e.target.value)}
              onBlur={() => {
                if (editedDescription !== task.description) {
                  onUpdate({ ...task, description: editedDescription });
                }
              }}
              disabled={!canEdit}
              placeholder="Add a description..."
              rows={3}
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none disabled:opacity-75 disabled:cursor-not-allowed"
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-2 block">
              Attachments
            </label>
            {canEdit && (
              <button className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors">
                <Upload className="w-4 h-4" />
                Click to upload
              </button>
            )}
          </div>

          {/* Assignees */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-2 block">
              Assignees
            </label>
            <div className="flex flex-wrap gap-2">
              {task.assignees.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-2 bg-neutral-50 px-2 py-1 rounded-lg border border-neutral-100"
                >
                  <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center text-xs font-medium">
                    {u.avatar || "U"}
                  </div>
                  <span className="text-sm text-neutral-900">{u.name}</span>
                  {canEdit && (
                    <button className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-500 hover:text-neutral-700 hover:border-neutral-400">
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-2 block">
              Due Date
            </label>
            <p className="text-sm text-neutral-900">
              {formatDate(task.dueDate)}
            </p>
          </div>

          {/* Team */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-2 block">
              Team
            </label>
            <p className="text-sm text-neutral-500">Add a team</p>
          </div>

          {/* Dependencies */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-2 block">
              Dependencies
            </label>
            <button className="flex items-center gap-1.5 px-3 py-2 border border-neutral-200 rounded-xl text-sm text-neutral-700 hover:bg-neutral-50 transition-colors">
              None
              <ChevronDown className="w-4 h-4 text-neutral-400" />
            </button>
          </div>

          {/* Activity */}
          <div>
            <div className="flex items-center gap-1 mb-4">
              {(["All", "Comments", "History"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                    activeTab === tab
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {mockComments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  {comment.avatar ? (
                    <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                      {comment.avatar}
                    </div>
                  ) : (
                    <div className="w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-neutral-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-900">
                        {comment.user}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {comment.time}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600 mt-1">
                      {comment.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delete Button */}
          {canDelete && (
            <div className="pt-4 border-t border-neutral-200">
              <Button
                variant="outline"
                onClick={() => {
                  onDelete(task.id);
                }}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                Delete Task
              </Button>
            </div>
          )}
        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-neutral-200">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
              <Smile className="w-5 h-5 text-neutral-400" />
            </button>
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-4 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
