"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  X, 
  Upload, 
  ChevronDown, 
  Smile, 
  Send, 
  Plus, 
  Trash2, 
  Check, 
  Download,
  FileIcon,
  Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth-provider";
import type { Task, TaskStatus, Priority, User as UserType, File as FileType } from "@/lib/types";
import { useFilesAPI } from "@/hooks/useFilesAPI";
import useSWR from "swr";
import { apiRequest } from "@/lib/api";
import { FilePreview } from "@/components/files/viewers/FilePreview";

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

const defaultStatusOptions = [
  { value: "todo", label: "To Do", bg: "bg-neutral-200", text: "text-neutral-700" },
  { value: "in-progress", label: "In Progress", bg: "bg-blue-500", text: "text-white" },
  { value: "done", label: "Done", bg: "bg-emerald-500", text: "text-white" },
];

const priorityOptions: { value: Priority; label: string; bg: string; text: string }[] = [
  { value: "low", label: "Low", bg: "bg-emerald-100", text: "text-emerald-700" },
  { value: "medium", label: "Medium", bg: "bg-amber-100", text: "text-amber-700" },
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
  const { uploadFile } = useFilesAPI();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<FileType | null>(null);

  useEffect(() => {
    if (task) {
      setEditedTitle(task.title);
      setEditedDescription(task.description || "");
    }
  }, [task?.id]);

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
    }
  }, [isOpen, task?.id]);

  // Fetch task attachments
  const { data: attachmentsData, mutate: mutateAttachments } = useSWR<{ files: FileType[] }>(
    isOpen && task ? `/api/files/?contextType=TASK&contextId=${task.id}` : null,
    apiRequest
  );
  const attachments = attachmentsData?.files || [];

  if (!isOpen || !task) return null;

  const isAssignee = task.assignees.some((a: any) => a.id === user?.id);
  const isCreator = (task as any).creatorId === user?.id;
  const canUserEdit = canEdit || isAssignee || isCreator;
  const canUserDelete = canDelete || isCreator;

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

  const currentStatus = statusOptions.find((s) => s.value === task.status) || { 
    value: task.status, label: task.status, bg: "bg-neutral-100", text: "text-neutral-700" 
  };
  const currentPriority = priorityOptions.find((s) => s.value === task.priority);

  const handleStatusChange = (status: string) => {
    onUpdate({ ...task, status: status as TaskStatus });
    setIsStatusOpen(false);
  };

  const handlePriorityChange = (priority: Priority) => {
    onUpdate({ ...task, priority });
    setIsPriorityOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;

    try {
      setIsUploading(true);
      
      await uploadFile(file, {
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        sourceContext: { type: "TASK", id: task.id }
      });

      mutateAttachments();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Not set";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white border-l border-neutral-200 shadow-xl z-50 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
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

          <div className="grid grid-cols-2 gap-6">
            {/* Status */}
            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Status</label>
              <div className="relative">
                <button
                  onClick={() => isEditing && canUserEdit && setIsStatusOpen(!isStatusOpen)}
                  disabled={!isEditing || !canUserEdit}
                  className={cn(
                    "px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1",
                    currentStatus?.bg, currentStatus?.text,
                    (!isEditing || !canUserEdit) && "opacity-75 cursor-default"
                  )}
                >
                  {currentStatus?.label}
                  {isEditing && canUserEdit && <ChevronDown className="w-3 h-3" />}
                </button>

                {isStatusOpen && isEditing && canUserEdit && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsStatusOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-20">
                      {statusOptions.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => handleStatusChange(status.value)}
                          className={cn("w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-neutral-50")}
                        >
                          <span className={cn("px-2 py-0.5 rounded", status.bg, status.text)}>{status.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Priority</label>
              <div className="relative">
                <button
                  onClick={() => isEditing && canUserEdit && setIsPriorityOpen(!isPriorityOpen)}
                  disabled={!isEditing || !canUserEdit}
                  className={cn(
                    "px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1",
                    currentPriority?.bg, currentPriority?.text,
                    (!isEditing || !canUserEdit) && "opacity-75 cursor-default"
                  )}
                >
                  {currentPriority?.label}
                  {isEditing && canUserEdit && <ChevronDown className="w-3 h-3" />}
                </button>

                {isPriorityOpen && isEditing && canUserEdit && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsPriorityOpen(false)} />
                    <div className="absolute left-0 top-full mt-1 w-36 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-20">
                      {priorityOptions.map((priority) => (
                        <button
                          key={priority.value}
                          onClick={() => handlePriorityChange(priority.value)}
                          className={cn("w-full text-left px-3 py-2 text-xs font-medium transition-colors hover:bg-neutral-50")}
                        >
                          <span className={cn("px-2 py-0.5 rounded", priority.bg, priority.text)}>{priority.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Description</label>
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
              className="w-full px-4 py-3 border border-transparent hover:border-neutral-100 focus:border-neutral-200 rounded-xl text-sm focus:outline-none transition-all resize-none disabled:bg-transparent disabled:opacity-90"
            />
          </div>

          {/* Assignees */}
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 block">Assignees</label>
            <div className="flex flex-wrap gap-2">
              {task.assignees.map((u: any) => (
                <div key={u.id} className="flex items-center gap-2 bg-neutral-50 px-2 py-1.5 rounded-full border border-neutral-100">
                  <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[10px] font-bold">
                    {u.avatar || u.name?.[0] || "U"}
                  </div>
                  <span className="text-xs font-bold text-neutral-700 pr-1">{u.name}</span>
                </div>
              ))}
              {isEditing && canUserEdit && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="w-8 h-8 rounded-full border-2 border-dashed border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-primary hover:border-primary transition-all">
                      <Plus className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="text-[10px] font-black text-neutral-400 uppercase tracking-tighter mb-2 px-1">Add Members</div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
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
                            className="flex items-center gap-2 p-2 hover:bg-neutral-50 rounded-lg cursor-pointer group"
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-primary border-primary text-white' : 'border-neutral-300 group-hover:border-primary'}`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <span className="text-xs font-bold text-neutral-700">{m.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 block">Due Date</label>
            {isEditing && canUserEdit ? (
              <input
                type="date"
                value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value).toISOString() : undefined;
                  onUpdate({ ...task, dueDate: newDate });
                }}
                className="px-3 py-2 border border-neutral-100 rounded-xl text-sm outline-none focus:border-primary w-full bg-neutral-50"
              />
            ) : (
              <p className="text-sm font-bold text-neutral-900">{formatDate(task.dueDate)}</p>
            )}
          </div>

          {/* Attachments Section */}
          <div className="pt-6 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                Attachments ({attachments.length})
              </label>
              {isUploading && (
                <div className="flex items-center gap-2 text-[10px] text-primary font-bold animate-pulse uppercase">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Uploading...
                </div>
              )}
            </div>

            {attachments.length > 0 && (
              <div className="grid grid-cols-1 gap-2 mb-4">
                {attachments.map((att) => (
                  <div 
                    key={att._id}
                    className="group flex items-center gap-3 p-3 rounded-2xl border border-neutral-100 bg-neutral-50/50 hover:bg-white hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => setSelectedPreviewFile(att)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white border border-neutral-100 flex items-center justify-center shadow-sm">
                      <FileIcon className="w-5 h-5 text-neutral-400 group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-neutral-900 truncate">{att.name}</p>
                      <p className="text-[10px] text-neutral-400 font-mono">
                        {(att.sizeBytes / 1024).toFixed(1)} KB • {new Date(att.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/api/files/files/${att._id}/download`;
                      }}
                    >
                      <Download className="w-4 h-4 text-neutral-500" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {canUserEdit && isEditing && (
              <div className="relative">
                <input
                  type="file"
                  id="task-file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <label 
                  htmlFor="task-file-upload"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-3xl bg-neutral-50 hover:bg-white hover:border-primary/30 hover:shadow-xl transition-all py-10 cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white border border-neutral-100 flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6 text-neutral-400 group-hover:text-primary" />
                  </div>
                  <span className="text-sm font-black text-neutral-900 uppercase tracking-tight">Add Project Assets</span>
                  <span className="text-[10px] text-neutral-400 font-bold mt-1 uppercase">PDF, Image or DOCX</span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-neutral-200 rounded-xl transition-colors">
              <Smile className="w-5 h-5 text-neutral-400" />
            </button>
            <input
              type="text"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-white border border-neutral-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
            />
            <button className="p-2.5 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-all shadow-md active:scale-95">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {selectedPreviewFile && (
        <FilePreview
          file={selectedPreviewFile}
          onClose={() => setSelectedPreviewFile(null)}
          onDownload={(f) => window.location.href = `/api/files/files/${f._id}/download`}
          onEdit={(f) => {
             if (f.name.toLowerCase().endsWith(".docx")) {
                window.location.href = `/files/edit/${f._id}`;
             }
          }}
        />
      )}
    </div>
  );
}
