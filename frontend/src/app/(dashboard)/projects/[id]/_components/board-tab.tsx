"use client";

import React, { useState } from "react";
import { Plus, X, Check, Trash2, Edit2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task, Milestone, TaskType, Priority } from "@/lib/types";

interface BoardColumn {
  id: string;
  label: string;
  color: string;
  isLocked?: boolean;
}

interface BoardTabProps {
  tasks: Task[];
  milestones: Milestone[];
  columns: BoardColumn[];
  onTaskClick: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
  onColumnsUpdate: (columns: BoardColumn[]) => void;
  onMilestoneCreate: () => void;
  canEdit: boolean;
  canEditTask?: (task: Task) => boolean;
}

export function BoardTab({
  tasks,
  milestones,
  columns,
  onTaskClick,
  onTaskUpdate,
  onColumnsUpdate,
  onMilestoneCreate,
  canEdit,
  canEditTask,
}: BoardTabProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState("");
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  
  // Filter State
  const [filterMilestone, setFilterMilestone] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const filteredTasks = tasks.filter((t) => {
    if (filterMilestone === "backlog") {
      if (t.milestoneId) return false;
    } else if (filterMilestone !== "all") {
      if (t.milestoneId !== filterMilestone) return false;
    }
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const colorOptions = [
    "bg-neutral-200",
    "bg-red-200",
    "bg-blue-200",
    "bg-green-200",
    "bg-yellow-200",
    "bg-purple-200",
  ];

  const handleUpdateColumnColor = (colId: string, color: string) => {
    onColumnsUpdate(columns.map((c) => (c.id === colId ? { ...c, color } : c)));
  };

  const handleDragStart = (task: Task) => {
    if (canEditTask ? !canEditTask(task) : !canEdit) return;
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (statusId: string) => {
    if (!draggedTask || (canEditTask ? !canEditTask(draggedTask) : !canEdit)) return;
    if (draggedTask.status !== statusId) {
      onTaskUpdate({ ...draggedTask, status: statusId });
    }
    setDraggedTask(null);
  };

  const handleAddColumn = () => {
    if (!newColumnName.trim()) return;
    const newId = newColumnName.toLowerCase().replace(/\s+/g, "-");
    const newCol = { id: newId, label: newColumnName, color: "bg-neutral-200" };
    onColumnsUpdate([...columns, newCol]);
    setNewColumnName("");
    setIsAddingColumn(false);
  };

  const handleDeleteColumn = (colId: string) => {
    if (
      confirm(
        "Delete this column? Tasks in this column will need reassignment."
      )
    ) {
      onColumnsUpdate(columns.filter((c) => c.id !== colId));
    }
  };

  const startEditing = (col: BoardColumn) => {
    setEditingColumnId(col.id);
    setNewColumnName(col.label);
  };

  const saveEditing = () => {
    if (editingColumnId) {
      onColumnsUpdate(
        columns.map((c) =>
          c.id === editingColumnId ? { ...c, label: newColumnName } : c
        )
      );
      setEditingColumnId(null);
      setNewColumnName("");
    }
  };

  const cancelEditing = () => {
    setEditingColumnId(null);
    setNewColumnName("");
    setIsAddingColumn(false);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header Actions & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-3 rounded-xl border border-neutral-200">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Milestone</span>
            <select
              value={filterMilestone}
              onChange={(e) => setFilterMilestone(e.target.value)}
              className="h-8 pl-2 pr-8 text-xs border rounded-lg bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10"
            >
              <option value="all">All Milestones</option>
              <option value="backlog">Backlog Only</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Type</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-8 pl-2 pr-8 text-xs border rounded-lg bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10"
            >
              <option value="all">All Types</option>
              <option value="task">Tasks</option>
              <option value="bug">Bugs</option>
              <option value="feature">Features</option>
              <option value="story">Stories</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase ml-1">Priority</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="h-8 pl-2 pr-8 text-xs border rounded-lg bg-neutral-50 outline-none focus:ring-2 focus:ring-primary/10"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end">
          {canEdit && (
            <>
              <button
                onClick={onMilestoneCreate}
                className="px-3 py-1.5 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Milestone
              </button>
              {isAddingColumn ? (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-5">
                  <input
                    autoFocus
                    className="h-8 px-2 border rounded-lg text-xs"
                    placeholder="Column Name"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
                  />
                  <button
                    onClick={handleAddColumn}
                    className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingColumn(true)}
                  className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-medium hover:bg-neutral-800 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Column
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main Board Layout (Single Loop) */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {columns.map((column) => (
          <div
            key={column.id}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
            className="bg-neutral-50 rounded-xl p-4 min-w-[300px] w-[300px] shrink-0 flex flex-col max-h-full"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              {editingColumnId === column.id ? (
                <div className="flex items-center gap-1 w-full">
                  <input
                    className="flex-1 h-7 px-2 border rounded text-sm"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                  />
                  <button onClick={saveEditing}>
                    <Check className="w-4 h-4 text-emerald-600" />
                  </button>
                  <button onClick={cancelEditing}>
                    <X className="w-4 h-4 text-neutral-400" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative group/color">
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full cursor-pointer",
                        column.color
                      )}
                    />
                    {canEdit && !column.isLocked && (
                      <div className="absolute top-full left-0 mt-2 bg-white p-2 rounded shadow-lg hidden group-active/color:flex gap-1 z-50">
                        {colorOptions.map((c) => (
                          <div
                            key={c}
                            className={cn(
                              "w-4 h-4 rounded-full cursor-pointer hover:scale-110 transition-transform",
                              c
                            )}
                            onClick={() =>
                              handleUpdateColumnColor(column.id, c)
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="font-medium text-neutral-900">
                    {column.label}
                  </span>
                  <span className="text-sm text-neutral-500">
                    ({filteredTasks.filter((t) => t.status === column.id).length})
                  </span>
                </div>
              )}

              {/* Logic for Lock vs Actions */}
              {column.isLocked ? (
                <Lock className="w-3.5 h-3.5 text-neutral-400" />
              ) : (
                canEdit &&
                !editingColumnId && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEditing(column)}
                      className="p-1 hover:bg-neutral-200 rounded text-neutral-500"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteColumn(column.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              )}
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1 min-h-0">
              {filteredTasks
                .filter((t) => t.status === column.id)
                .map((task) => {
                  const isTaskEditable = canEditTask ? canEditTask(task) : canEdit;
                  return (
                  <div
                    key={task.id}
                    draggable={isTaskEditable}
                    onDragStart={() => handleDragStart(task)}
                    onClick={() => onTaskClick(task)}
                    className={cn(
                      "bg-white border border-neutral-200 rounded-xl p-4 cursor-pointer hover:shadow-sm transition-all",
                      isTaskEditable && "cursor-grab active:cursor-grabbing",
                      draggedTask?.id === task.id && "opacity-50 border-primary"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-neutral-900 text-sm leading-snug">
                        {task.title}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-neutral-500 mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-auto">
                      <span
                        className={cn(
                          "text-[10px] font-medium px-2 py-0.5 rounded uppercase tracking-wide",
                          task.priority === "high"
                            ? "bg-red-50 text-red-600"
                            : task.priority === "medium"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-green-50 text-green-600"
                        )}
                      >
                        {task.priority}
                      </span>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center -space-x-1.5">
                          {task.assignees && task.assignees.length > 0 ? (
                            <>
                              <div
                                className="w-6 h-6 bg-neutral-100 rounded-full flex items-center justify-center text-[10px] font-medium text-neutral-600 border border-white shadow-sm"
                                title={task.assignees[0].name}
                              >
                                {task.assignees[0].avatar}
                              </div>
                              {task.assignees.length > 1 && (
                                <div
                                  className="w-6 h-6 bg-neutral-800 text-white rounded-full flex items-center justify-center text-[9px] font-medium border border-white shadow-sm"
                                  title={`+${task.assignees.length - 1} others`}
                                >
                                  +{task.assignees.length - 1}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="w-6 h-6 bg-neutral-50 rounded-full flex items-center justify-center text-[10px] border border-neutral-200">
                              U
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )})}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
