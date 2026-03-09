"use client";

import { useState } from "react";
import { useEffect } from "react";
import { X, Upload, ChevronDown, Smile, Send, Plus, Trash2, Check, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth-provider";
import type { Task, TaskStatus, Priority, User as UserType } from "@/lib/types";

interface TaskDetailPanelProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (task: Task) => void;
  onDelete: (taskId: string) => void;
  canEdit: boolean;
  canDelete: boolean;
  projectMembers?: UserType[];
  boardColumns?: { id: string; label: string; color: string; isLocked?: boolean }[];
}

const defaultStatusOptions: {
  value: string;
  label: string;
  bg: string;
  text: string;
}[] = [
    {
      value: "todo",
      label: "To Do",
      bg: "bg-neutral-200",
      text: "text-neutral-700",
    },
    {
      value: "in-progress",
      label: "In Progress",
      bg: "bg-blue-500",
      text: "text-white",
    },
    { value: "done", label: "Done", bg: "bg-emerald-500", text: "text-white" },
  ];

const priorityOptions: {
  value: Priority;
  label: string;
  bg: string;
  text: string;
}[] = [
    {
      value: "low",
      label: "Low",
      bg: "bg-emerald-100",
      text: "text-emerald-700",
    },
    {
      value: "medium",
      label: "Medium",
      bg: "bg-amber-100",
      text: "text-amber-700",
    },
    { value: "high", label: "High", bg: "bg-red-100", text: "text-red-700" },
  ];

export function TaskDetailPanel({
  task,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  canEdit,
  canDelete,
  projectMembers,
  boardColumns,
}: TaskDetailPanelProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen, task?.id]);

  if (!isOpen || !task) return null;

  const isAssignee = task.assignees.some((a: any) => a.id === user?.id);
  const isCreator = (task as any).creatorId === user?.id;
  const canUserEdit = canEdit || isAssignee || isCreator;
  const canUserDelete = canDelete || isCreator;

  // Build status options: merge default statuses with any custom board columns
  const statusOptions = (() => {
    if (!boardColumns || boardColumns.length === 0) return defaultStatusOptions;
    const defaultIds = defaultStatusOptions.map(s => s.value);
    const custom = boardColumns
      .filter(col => !defaultIds.includes(col.id))
      .map(col => ({
        value: col.id,
        label: col.label,
        bg: col.color || "bg-purple-100",
        text: col.color?.includes("200") || col.color?.includes("100") ? "text-neutral-700" : "text-white",
      }));
    return [...defaultStatusOptions, ...custom];
  })();

  const currentStatus = statusOptions.find((s) => s.value === task.status) || { value: task.status, label: task.status, bg: "bg-neutral-100", text: "text-neutral-700" };
  const currentPriority = priorityOptions.find(
    (s) => s.value === task.priority
  );

  const handleStatusChange = (status: string) => {
    onUpdate({ ...task, status: status as TaskStatus });
    setIsStatusOpen(false);
  };

  const handlePriorityChange = (priority: Priority) => {
    onUpdate({ ...task, priority });
    setIsPriorityOpen(false);
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
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
          <span className="text-sm text-neutral-500">{task.id}</span>
        </div>
        <div className="flex items-center gap-2">
           {canUserEdit && (
              <button 
                 onClick={() => setIsEditing(!isEditing)}
                 className={cn("px-3 py-1.5 text-sm font-medium rounded-lg transition-colors", isEditing ? 'bg-primary text-white hover:bg-primary/90' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200')}
              >
                 {isEditing ? 'Done' : 'Edit'}
              </button>
           )}
           {canUserDelete && (
             <button 
               onClick={() => onDelete(task.id)}
               className="p-2 hover:bg-red-50 text-neutral-400 hover:text-red-500 rounded-lg transition-colors"
             >
               <Trash2 className="w-5 h-5" />
             </button>
           )}
        </div>
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
              disabled={!isEditing || !canUserEdit}
              className="w-full px-3 py-2 text-xl font-semibold text-neutral-900 bg-transparent border-none focus:outline-none focus:ring-0 disabled:opacity-100"
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-2 block">
              Status
            </label>
            <div className="relative">
              <button
                onClick={() => isEditing && canUserEdit && setIsStatusOpen(!isStatusOpen)}
                disabled={!isEditing || !canUserEdit}
                className={cn(
                  "px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1",
                  currentStatus?.bg,
                  currentStatus?.text,
                  (!isEditing || !canUserEdit) && "opacity-75 cursor-default"
                )}
              >
                {currentStatus?.label}
                {isEditing && canUserEdit && <ChevronDown className="w-3 h-3" />}
              </button>

              {isStatusOpen && isEditing && canUserEdit && (
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

          {/* Priority */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-2 block">
              Priority
            </label>
            <div className="relative">
              <button
                onClick={() => isEditing && canUserEdit && setIsPriorityOpen(!isPriorityOpen)}
                disabled={!isEditing || !canUserEdit}
                className={cn(
                  "px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1",
                  currentPriority?.bg,
                  currentPriority?.text,
                  (!isEditing || !canUserEdit) && "opacity-75 cursor-default"
                )}
              >
                {currentPriority?.label}
                {isEditing && canUserEdit && <ChevronDown className="w-3 h-3" />}
              </button>

              {isPriorityOpen && isEditing && canUserEdit && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsPriorityOpen(false)}
                  />
                  <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-20">
                    {priorityOptions.map((priority) => (
                      <button
                        key={priority.value}
                        onClick={() => handlePriorityChange(priority.value)}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs font-medium transition-colors",
                          task.priority === priority.value
                            ? "bg-neutral-100"
                            : "hover:bg-neutral-50"
                        )}
                      >
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded",
                            priority.bg,
                            priority.text
                          )}
                        >
                          {priority.label}
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
              disabled={!isEditing || !canUserEdit}
              placeholder={isEditing ? "Add a description..." : "No description."}
              rows={3}
              className="w-full px-4 py-2.5 border border-transparent hover:border-neutral-200 focus:border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none disabled:bg-transparent disabled:opacity-90 disabled:cursor-default"
            />
          </div>

          {/* Assignees */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-2 block">
              Assignees
            </label>
            <div className="flex flex-wrap gap-2">
              {task.assignees.map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center gap-2 bg-neutral-50 px-2 py-1 rounded-lg border border-neutral-100"
                >
                  <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center text-xs font-medium">
                    {u.avatar || u.name?.[0] || "U"}
                  </div>
                  <span className="text-sm text-neutral-900">{u.name}</span>
                </div>
              ))}
              {isEditing && canUserEdit && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-500 hover:text-neutral-700 hover:border-neutral-400">
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="text-xs font-semibold text-neutral-500 mb-2 px-1">Assign Members</div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {projectMembers?.map((m: UserType) => {
                        const isSelected = task.assignees.some((a: any) => a.id === m.id);
                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              const newAssignees = isSelected 
                                ? task.assignees.filter((a: any) => a.id !== m.id)
                                : [...task.assignees, m];
                              onUpdate({...task, assignees: newAssignees});
                            }}
                            className="flex items-center gap-2 p-1.5 hover:bg-neutral-100 rounded cursor-pointer"
                          >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isSelected ? 'bg-primary border-primary text-white' : 'border-neutral-300'}`}>
                              {isSelected && <Check className="w-2.5 h-2.5" />}
                            </div>
                            <div className="w-5 h-5 bg-neutral-200 rounded-full flex items-center justify-center text-[9px] font-medium text-neutral-600">
                              {m.avatar || m.name[0]}
                            </div>
                            <span className="text-xs text-neutral-700 truncate">{m.name}</span>
                          </div>
                        )
                      })}
                      {(!projectMembers || projectMembers.length === 0) && (
                        <div className="text-xs text-neutral-400 text-center p-2">No members</div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-2 block">
              Due Date
            </label>
            {isEditing && canUserEdit ? (
              <input
                type="date"
                value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                  onUpdate({ ...task, dueDate: newDate });
                }}
                className="px-3 py-2 border border-neutral-200 rounded-lg text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all w-full bg-white cursor-pointer"
              />
            ) : (
              <p className="text-sm text-neutral-900">
                {formatDate(task.dueDate)}
              </p>
            )}
          </div>

          {/* Attachment */}
          {canUserEdit && isEditing && (
            <div className="pt-4 border-t border-neutral-200">
              <label className="text-sm font-medium text-neutral-500 mb-2 block">
                Attachments
              </label>
              <button className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-xl bg-neutral-50 hover:bg-neutral-100 transition-colors py-6 text-neutral-500 hover:text-neutral-700 w-full">
                 <Upload className="w-5 h-5 mb-2" />
                 <span className="text-xs font-medium">Click to upload files</span>
                 <span className="text-[10px]">SVG, PNG, JPG or PDF</span>
              </button>
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
