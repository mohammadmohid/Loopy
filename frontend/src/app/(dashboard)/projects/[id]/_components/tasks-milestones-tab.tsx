"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  MoreVertical,
  AlertTriangle,
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
  onTaskCreate: (task: Task) => void;
  onTaskUpdate: (task: Task) => void;
  onMilestoneCreate: (milestone: Milestone) => void;
  onMilestoneUpdate: (milestone: Milestone) => void;
  onMilestoneDelete: (milestoneId: string) => void;
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

const typeIcons: Record<TaskType, typeof CheckSquare> = {
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
  const [filters, setFilters] = useState({
    assignee: "all",
    type: "all",
    status: "all",
  });

  // Get tasks not assigned to any milestone
  const unassignedTasks = useMemo(() => {
    return tasks.filter((t) => !t.milestoneId);
  }, [tasks]);

  // Filter tasks based on search and filters
  const filterTasks = (taskList: Task[]) => {
    return taskList.filter((task) => {
      // Search filter
      if (
        searchQuery &&
        !task.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      // Type filter
      if (filters.type !== "all" && task.type !== filters.type) {
        return false;
      }
      // Status filter
      if (filters.status !== "all" && task.status !== filters.status) {
        return false;
      }
      return true;
    });
  };

  const toggleMilestone = (milestoneId: string) => {
    setExpandedMilestones((prev) =>
      prev.includes(milestoneId)
        ? prev.filter((id) => id !== milestoneId)
        : [...prev, milestoneId]
    );
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) return;

    const newTask: Task = {
      id: `T-${Date.now()}`,
      title: newTaskTitle,
      status: "todo",
      type: newTaskType,
      priority: "medium",
      projectId: "1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onTaskCreate(newTask);
    setNewTaskTitle("");
    setNewTaskType("task");
    setIsCreatingTask(false);
  };

  const handleMilestoneClick = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setIsMilestoneOverlayOpen(true);
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    })} - ${endDate.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    })}`;
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <>
      <div className="space-y-4">
        {/* Search and Filters */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search Tasks & Milestones"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

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
                { value: "bug", label: "Bug" },
                { value: "feature", label: "Feature" },
                { value: "story", label: "Story" },
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
            <button className="px-4 py-2 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors">
              Import
            </button>
          </div>
        </div>

        {/* Milestones */}
        {milestones.map((milestone) => {
          const milestoneTasks = filterTasks(
            tasks.filter((t) => t.milestoneId === milestone.id)
          );
          const isExpanded = expandedMilestones.includes(milestone.id);

          return (
            <div
              key={milestone.id}
              className="border border-neutral-200 rounded-xl overflow-hidden"
            >
              {/* Milestone Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleMilestone(milestone.id)}>
                    <ChevronDown
                      className={cn(
                        "w-5 h-5 text-neutral-500 transition-transform",
                        !isExpanded && "-rotate-90"
                      )}
                    />
                  </button>
                  <span className="font-medium text-neutral-900">
                    {milestone.name}
                  </span>
                  <span className="text-sm text-neutral-500">
                    ({milestoneTasks.length})
                  </span>
                  <span className="text-sm text-primary">
                    {formatDateRange(milestone.startDate, milestone.dueDate)}
                  </span>
                </div>
                <button
                  onClick={() => handleMilestoneClick(milestone)}
                  className="p-1.5 hover:bg-neutral-200 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-neutral-500" />
                </button>
              </div>

              {/* Milestone Tasks */}
              {isExpanded && (
                <div className="divide-y divide-neutral-100">
                  {milestoneTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onClick={() => onTaskClick(task)}
                      onStatusChange={(status) =>
                        onTaskUpdate({ ...task, status })
                      }
                      isOverdue={isOverdue(task.dueDate)}
                      canEdit={canEdit}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Unassigned Tasks Section */}
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-200">
            <div className="flex items-center gap-2">
              <ChevronDown className="w-5 h-5 text-neutral-500" />
              <span className="font-medium text-neutral-900">Tasks</span>
              <span className="text-sm text-neutral-500">
                ({filterTasks(unassignedTasks).length})
              </span>
            </div>
            {canEdit && (
              <button
                onClick={() => {
                  const newMilestone: Milestone = {
                    id: `M-${Date.now()}`,
                    name: "New Milestone",
                    description: "",
                    startDate: new Date().toISOString().split("T")[0],
                    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0],
                    tasks: [],
                    projectId: "1",
                  };
                  onMilestoneCreate(newMilestone);
                }}
                className="px-3 py-1.5 border border-neutral-200 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                Create Milestone
              </button>
            )}
          </div>

          <div className="divide-y divide-neutral-100">
            {filterTasks(unassignedTasks).map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                onStatusChange={(status) => onTaskUpdate({ ...task, status })}
                isOverdue={isOverdue(task.dueDate)}
                canEdit={canEdit}
              />
            ))}

            {/* Create Task Input */}
            {canEdit && (
              <div className="px-4 py-3">
                {isCreatingTask ? (
                  <div className="flex items-center gap-3">
                    <TypeDropdown
                      value={newTaskType}
                      onChange={setNewTaskType}
                    />
                    <input
                      type="text"
                      placeholder="Enter task name..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateTask();
                        if (e.key === "Escape") {
                          setIsCreatingTask(false);
                          setNewTaskTitle("");
                        }
                      }}
                      autoFocus
                      className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <span className="text-xs text-neutral-400">
                      Press Enter to create
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsCreatingTask(true)}
                    className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Create</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Milestone Overlay */}
      <MilestoneOverlay
        milestone={selectedMilestone}
        isOpen={isMilestoneOverlayOpen}
        onClose={() => {
          setIsMilestoneOverlayOpen(false);
          setSelectedMilestone(null);
        }}
        onUpdate={onMilestoneUpdate}
        onDelete={onMilestoneDelete}
        onTaskClick={onTaskClick}
        onTaskStatusChange={(taskId, status) => {
          const task = tasks.find((t) => t.id === taskId);
          if (task) onTaskUpdate({ ...task, status });
        }}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </>
  );
}

interface TaskRowProps {
  task: Task;
  onClick: () => void;
  onStatusChange: (status: TaskStatus) => void;
  isOverdue: boolean;
  canEdit: boolean;
}

function TaskRow({
  task,
  onClick,
  onStatusChange,
  isOverdue,
  canEdit,
}: TaskRowProps) {
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const Icon = typeIcons[task.type];

  // Status dot colors
  const statusDotColors: Record<TaskStatus, string> = {
    done: "bg-amber-500",
    "in-progress": "bg-emerald-500",
    todo: "bg-red-500",
  };

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
        <Icon className="w-4 h-4 text-neutral-400" />
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
      <div className="w-7 h-7 bg-neutral-200 rounded-full flex items-center justify-center text-[10px] font-medium text-neutral-600 ml-2">
        {task.assignee?.avatar || "MM"}
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

interface TypeDropdownProps {
  value: TaskType;
  onChange: (value: TaskType) => void;
}

function TypeDropdown({ value, onChange }: TypeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = typeIcons[value];

  const types: { value: TaskType; label: string; icon: typeof CheckSquare }[] =
    [
      { value: "task", label: "Task", icon: CheckSquare },
      { value: "bug", label: "Bug", icon: Bug },
      { value: "feature", label: "Feature", icon: Lightbulb },
      { value: "story", label: "Story", icon: BookOpen },
    ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-neutral-200 rounded-lg text-sm hover:bg-neutral-50 transition-colors"
      >
        <Icon className="w-4 h-4 text-neutral-500" />
        <ChevronDown className="w-3 h-3 text-neutral-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-20">
            {types.map((type) => {
              const TypeIcon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => {
                    onChange(type.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors",
                    value === type.value
                      ? "bg-neutral-100"
                      : "hover:bg-neutral-50"
                  )}
                >
                  <TypeIcon className="w-4 h-4 text-neutral-500" />
                  {type.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
