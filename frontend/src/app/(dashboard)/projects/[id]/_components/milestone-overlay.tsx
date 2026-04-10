"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Pencil,
  Upload,
  ChevronDown,
  MoreVertical,
  AlertTriangle,
  CheckSquare,
  Search,
  Check,
  Users,
  User as UserIcon,
  Trash2,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Milestone, Task, TaskStatus, User } from "@/lib/types";

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
  projectMembers?: User[];
  availableTeams?: any[];
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
  projectMembers = [],
  availableTeams = [],
}: MilestoneOverlayProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(milestone?.name || "");
  const [editedDescription, setEditedDescription] = useState(milestone?.description || "");
  const [editedStartDate, setEditedStartDate] = useState("");
  const [editedDueDate, setEditedDueDate] = useState("");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");

  useEffect(() => {
    if (milestone) {
      setEditedName(milestone.name);
      setEditedDescription(milestone.description || "");
      setEditedStartDate(milestone.startDate ? new Date(milestone.startDate).toISOString().split("T")[0] : "");
      setEditedDueDate(milestone.dueDate ? new Date(milestone.dueDate).toISOString().split("T")[0] : "");
    }
  }, [milestone]);

  if (!isOpen || !milestone) return null;

  const handleNameSave = () => {
    if (editedName.trim() && editedName !== milestone.name) {
      onUpdate({ ...milestone, name: editedName });
    }
    setIsEditingName(false);
  };

  const handleDescSave = () => {
    if (editedDescription !== (milestone.description || "")) {
      onUpdate({ ...milestone, description: editedDescription });
    }
    setIsEditingDesc(false);
  };

  const handleDateChange = (field: "startDate" | "dueDate", value: string) => {
    if (field === "startDate") setEditedStartDate(value);
    else setEditedDueDate(value);
    onUpdate({
      ...milestone,
      [field]: value ? new Date(value).toISOString() : milestone[field],
    });
  };

  const handleToggleAssignee = (user: User) => {
    const exists = milestone.assignees.some((a) => a.id === user.id);
    const newAssignees = exists
      ? milestone.assignees.filter((a) => a.id !== user.id)
      : [...milestone.assignees, user];
    onUpdate({ ...milestone, assignees: newAssignees });
  };

  const handleToggleTeam = (team: any) => {
    const teamId = team._id || team.id;
    const current = milestone.assignedTeams || [];
    const exists = current.some((t: any) => (t._id || t.id) === teamId);
    const newTeams = exists
      ? current.filter((t: any) => (t._id || t.id) !== teamId)
      : [...current, { id: teamId, _id: teamId, name: team.name }];
    onUpdate({ ...milestone, assignedTeams: newTeams });
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

  const filteredMembers = projectMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
      m.email?.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const filteredTeams = availableTeams.filter((t) =>
    t.name.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const looksLikeUrl = (s: string) => /^https?:\/\//.test(s) || s.startsWith("/");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <div className="flex items-center gap-2 flex-1 min-w-0">
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
                className="text-lg font-semibold text-neutral-900 bg-transparent border-b-2 border-primary focus:outline-none w-full"
              />
            ) : (
              <>
                <h2 className="text-lg font-semibold text-neutral-900 truncate">
                  {milestone.name}
                </h2>
                {milestone.status === "completed" && (
                  <span className="shrink-0 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">
                    Completed
                  </span>
                )}
                {canEdit && (
                  <button
                    onClick={() => {
                      setEditedName(milestone.name);
                      setIsEditingName(true);
                    }}
                    className="p-1 hover:bg-neutral-100 rounded transition-colors shrink-0"
                  >
                    <Pencil className="w-4 h-4 text-neutral-400" />
                  </button>
                )}
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg transition-colors shrink-0 ml-2"
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
            {isEditingDesc && canEdit ? (
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onBlur={handleDescSave}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setEditedDescription(milestone.description || "");
                    setIsEditingDesc(false);
                  }
                }}
                autoFocus
                rows={3}
                className="w-full text-sm text-neutral-700 border border-neutral-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                placeholder="Add a description..."
              />
            ) : (
              <p
                onClick={() => canEdit && setIsEditingDesc(true)}
                className={cn(
                  "text-neutral-600 text-sm rounded-lg px-3 py-2 border border-transparent",
                  canEdit && "hover:border-neutral-200 cursor-pointer transition-colors"
                )}
              >
                {milestone.description || "Add a description..."}
              </p>
            )}
          </div>

          {/* Dates - Editable */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-neutral-500 mb-1 block">
                Start Date
              </label>
              {canEdit ? (
                <div className="relative flex border border-neutral-200 rounded-lg bg-white items-center px-3 py-2">
                  <Calendar className="w-4 h-4 text-neutral-400 mr-2" />
                  <input
                    type="date"
                    value={editedStartDate}
                    onChange={(e) => handleDateChange("startDate", e.target.value)}
                    className="text-sm focus:outline-none bg-transparent cursor-pointer text-neutral-700 w-full"
                  />
                </div>
              ) : (
                <p className="text-sm text-neutral-900">{formatDate(milestone.startDate)}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-neutral-500 mb-1 block">
                Due date
              </label>
              {canEdit ? (
                <div className="relative flex border border-neutral-200 rounded-lg bg-white items-center px-3 py-2">
                  <Calendar className="w-4 h-4 text-neutral-400 mr-2" />
                  <input
                    type="date"
                    value={editedDueDate}
                    onChange={(e) => handleDateChange("dueDate", e.target.value)}
                    className="text-sm focus:outline-none bg-transparent cursor-pointer text-neutral-700 w-full"
                  />
                </div>
              ) : (
                <p className="text-sm text-neutral-900">{formatDate(milestone.dueDate)}</p>
              )}
            </div>
          </div>

          {/* Assignees & Teams */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-2 block">
              Assignees & Teams
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {milestone.assignees && milestone.assignees.length > 0 &&
                milestone.assignees.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-2 bg-neutral-50 px-2.5 py-1.5 rounded-lg border border-neutral-100 group"
                  >
                    <div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center text-xs font-medium overflow-hidden shrink-0">
                      {u.avatar && looksLikeUrl(u.avatar) ? (
                        <img src={u.avatar} alt={u.name} className="object-cover w-full h-full" />
                      ) : (
                        u.avatar || u.name?.[0]?.toUpperCase() || "U"
                      )}
                    </div>
                    <span className="text-sm text-neutral-900">{u.name}</span>
                    {canEdit && (
                      <button
                        onClick={() => handleToggleAssignee(u)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-neutral-200 rounded"
                      >
                        <X className="w-3 h-3 text-neutral-500" />
                      </button>
                    )}
                  </div>
                ))}
              {milestone.assignedTeams && milestone.assignedTeams.length > 0 &&
                milestone.assignedTeams.map((t: any) => (
                  <div
                    key={t._id || t.id}
                    className="flex items-center gap-2 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100 group"
                  >
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-blue-800 font-medium">{t.name}</span>
                    {canEdit && (
                      <button
                        onClick={() => handleToggleTeam(t)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-blue-100 rounded"
                      >
                        <X className="w-3 h-3 text-blue-500" />
                      </button>
                    )}
                  </div>
                ))}
              {(!milestone.assignees || milestone.assignees.length === 0) &&
                (!milestone.assignedTeams || milestone.assignedTeams.length === 0) && (
                  <span className="text-sm text-neutral-400">No assignees</span>
                )}
            </div>

            {canEdit && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 border border-dashed border-neutral-300 rounded-lg px-3 py-2 hover:bg-neutral-50 transition-colors w-full justify-center">
                    <UserIcon className="w-4 h-4" />
                    Add members or teams
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <div className="p-2 border-b border-neutral-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Search members or teams..."
                        value={assigneeSearch}
                        onChange={(e) => setAssigneeSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-neutral-50 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2">
                    {filteredTeams.length > 0 && (
                      <div className="mb-2">
                        <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                          <Users className="w-3 h-3" /> Teams
                        </div>
                        {filteredTeams.map((team: any) => {
                          const tId = team._id || team.id;
                          const isSelected = (milestone.assignedTeams || []).some(
                            (t: any) => (t._id || t.id) === tId
                          );
                          return (
                            <div
                              key={tId}
                              onClick={() => handleToggleTeam(team)}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-50 rounded-md cursor-pointer"
                            >
                              <div
                                className={cn(
                                  "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                  isSelected
                                    ? "bg-primary border-primary text-white"
                                    : "border-neutral-300"
                                )}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                              <Users className="w-4 h-4 text-blue-500" />
                              <span className="text-sm text-neutral-700">{team.name}</span>
                              <span className="text-[10px] text-neutral-400 ml-auto">
                                {team.members?.length || 0} members
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {filteredMembers.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                          <UserIcon className="w-3 h-3" /> Members
                        </div>
                        {filteredMembers.map((m) => {
                          const isSelected = milestone.assignees.some((a) => a.id === m.id);
                          return (
                            <div
                              key={m.id}
                              onClick={() => handleToggleAssignee(m)}
                              className="flex items-center gap-2 px-2 py-1.5 hover:bg-neutral-50 rounded-md cursor-pointer"
                            >
                              <div
                                className={cn(
                                  "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                                  isSelected
                                    ? "bg-primary border-primary text-white"
                                    : "border-neutral-300"
                                )}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>
                              <div className="w-5 h-5 bg-neutral-200 rounded-full flex items-center justify-center text-[9px] font-medium text-neutral-600 overflow-hidden shrink-0">
                                {m.avatar && looksLikeUrl(m.avatar) ? (
                                  <img src={m.avatar} alt={m.name} className="object-cover w-full h-full" />
                                ) : (
                                  m.avatar || m.name?.[0]?.toUpperCase() || "U"
                                )}
                              </div>
                              <span className="text-sm text-neutral-700 truncate">{m.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {filteredMembers.length === 0 && filteredTeams.length === 0 && (
                      <div className="text-xs text-neutral-400 text-center py-4">No results</div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Tasks */}
          <div>
            <label className="text-sm font-medium text-neutral-500 mb-3 block">
              Tasks ({milestone.tasks?.length || 0})
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
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
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

  const looksLikeUrl = (s: string) => /^https?:\/\//.test(s) || s.startsWith("/");

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
        <span className="text-sm text-neutral-500">{task.id?.slice(-4)}</span>
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
            statusColors[task.status]?.bg || statusColors.todo.bg,
            statusColors[task.status]?.text || statusColors.todo.text
          )}
        >
          {statusLabels[task.status] || task.status}
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
          statusDotColors[task.status] || "bg-neutral-300"
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
            <div className="w-7 h-7 bg-neutral-200 rounded-full flex items-center justify-center text-[10px] font-medium text-neutral-600 border border-white overflow-hidden">
              {task.assignees[0].avatar && looksLikeUrl(task.assignees[0].avatar) ? (
                <img src={task.assignees[0].avatar} alt={task.assignees[0].name} className="object-cover w-full h-full" />
              ) : (
                task.assignees[0].avatar || "U"
              )}
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
