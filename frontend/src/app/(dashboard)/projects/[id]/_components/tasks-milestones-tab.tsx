"use client";

import { useState, useRef, useMemo } from "react";
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
  User,
  Check,
  Download,
  Info,
  Filter,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MilestoneOverlay } from "./milestone-overlay";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Task, Milestone, TaskStatus, TaskType, User as UserType } from "@/lib/types";

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
  onMilestoneComplete?: (milestoneId: string) => void;
  onGroupUnassigned?: () => void;
  canEdit: boolean;
  canDelete: boolean;
  projectMembers?: UserType[];
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
  onMilestoneComplete,
  onGroupUnassigned,
  canEdit,
  projectMembers = [],
}: TasksMilestonesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMilestones, setExpandedMilestones] = useState<string[]>(
    milestones.map((m) => m.id)
  );

  // Filter State
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // Inline Creation State
  const [creatingTaskIn, setCreatingTaskIn] = useState<
    string | "unassigned" | null
  >(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<TaskType>("task");
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>("");
  const [newTaskAssignees, setNewTaskAssignees] = useState<UserType[]>([]);

  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(
    null
  );
  const [isMilestoneOverlayOpen, setIsMilestoneOverlayOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter helper
  const matchesFilters = (t: Task) => {
    const lowerQ = searchQuery.toLowerCase();
    if (
      searchQuery &&
      !t.title?.toLowerCase().includes(lowerQ) &&
      !t.description?.toLowerCase().includes(lowerQ)
    ) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  };

  const unassignedTasks = useMemo(
    () => tasks.filter((t) => !t.milestoneId && matchesFilters(t)),
    [tasks, searchQuery, filterStatus, filterPriority]
  );

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
    // Logic: Start = today, End = max of unassigned tasks
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
      dueDate: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : undefined,
      assignees: newTaskAssignees,
    });
    setNewTaskTitle("");
    setNewTaskDueDate("");
    setNewTaskAssignees([]);
    setCreatingTaskIn(null); // Reset
  };

  const toggleMilestone = (id: string) => {
    setExpandedMilestones((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleDrop = (e: React.DragEvent, targetMilestoneId: string | undefined) => {
    e.preventDefault();
    if (!canEdit) return;
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // If same milestone, ignore for now (reordering within same group might need `order` field)
    if (task.milestoneId === targetMilestoneId) return;

    onTaskUpdate({ ...task, milestoneId: targetMilestoneId });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-xl border border-neutral-200">
          <div className="flex items-center gap-3 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search tasks & milestones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={`gap-2 h-[38px] ${filterStatus !== "all" || filterPriority !== "all" ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" : ""}`}>
                  <Filter className="w-4 h-4" />
                  Filters
                  {(filterStatus !== "all" || filterPriority !== "all") && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 ml-1" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-4 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-sm">Filter Tasks</h4>
                  {(filterStatus !== "all" || filterPriority !== "all") && (
                    <button
                      onClick={() => { setFilterStatus("all"); setFilterPriority("all"); }}
                      className="text-xs text-neutral-500 hover:text-neutral-900 flex items-center"
                    >
                      <X className="w-3 h-3 mr-1" /> Clear
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-700">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full text-sm border border-neutral-200 rounded-md p-2 h-9 outline-none focus:border-primary bg-white cursor-pointer"
                    >
                      <option value="all">All Statuses</option>
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">In Review</option>
                      <option value="done">Done</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-neutral-700">Priority</label>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      className="w-full text-sm border border-neutral-200 rounded-md p-2 h-9 outline-none focus:border-primary bg-white cursor-pointer"
                    >
                      <option value="all">All Priorities</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const data = { milestones, tasks };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `project-export.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="gap-2"
            >
              <Download className="w-4 h-4" /> Export
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <button className="text-neutral-400 hover:text-neutral-600 transition-colors px-1" title="View JSON Format">
                  <Info className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-xs p-3 font-mono overflow-auto" align="end">
                <div className="font-semibold mb-2 font-sans tracking-tight">Expected JSON Format:</div>
                <pre className="text-[10px] text-neutral-600 whitespace-pre-wrap">
                  {`{
  "milestones": [
    { "title": "Phase 1", "description": "..." }
  ],
  "tasks": [
    { "title": "Buy domain", "description": "..." }
  ]
}`}
                </pre>
              </PopoverContent>
            </Popover>

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
              className="gap-2 bg-neutral-900 text-white hover:bg-neutral-800 hover:text-white"
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
                    className={`p-1 rounded-md transition-transform duration-200 ${!expandedMilestones.includes(milestone.id)
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
                      {(() => {
                        const validStarts = (milestone.tasks || []).map((t: any) => new Date(t.createdAt || t.dueDate || 0).getTime()).filter((t: any) => t > 0);
                        const dynamicStart = validStarts.length ? new Date(Math.min(...validStarts)).toISOString() : milestone.startDate;

                        const validEnds = (milestone.tasks || []).map((t: any) => new Date(t.dueDate || 0).getTime()).filter((t: any) => t > 0);
                        const dynamicEnd = validEnds.length ? new Date(Math.max(...validEnds)).toISOString() : milestone.dueDate;
                        return (
                          <>
                            {new Date(dynamicStart).toLocaleDateString()} -{" "}
                            {new Date(dynamicEnd).toLocaleDateString()}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Actions */}
                  {canEdit && onMilestoneComplete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMilestoneComplete(milestone.id);
                      }}
                      className="p-1 hover:bg-green-100/50 rounded-lg text-green-600 transition-colors"
                      title="Complete Milestone"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMilestone(milestone);
                      setIsMilestoneOverlayOpen(true);
                    }}
                    className="p-1 hover:bg-neutral-200 rounded-lg text-neutral-500"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedMilestones.includes(milestone.id) && (
                <div
                  className="divide-y divide-neutral-100 min-h-[40px]"
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                  onDrop={(e) => handleDrop(e, milestone.id)}
                >
                  {milestone.tasks?.filter(matchesFilters).map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      canEdit={canEdit}
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
                      dueDate={newTaskDueDate}
                      setDueDate={setNewTaskDueDate}
                      assignees={newTaskAssignees}
                      setAssignees={setNewTaskAssignees}
                      projectMembers={projectMembers}
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
            <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <span className="font-semibold text-neutral-900">
                Unassigned Tasks
              </span>
              {canEdit && unassignedTasks.length > 0 && onGroupUnassigned && (
                <Button variant="outline" size="sm" onClick={onGroupUnassigned} className="h-7 text-xs shadow-sm bg-white">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Milestone
                </Button>
              )}
            </div>
            <div
              className="divide-y divide-neutral-100 min-h-[50px]"
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
              onDrop={(e) => handleDrop(e, undefined)}
            >
              {unassignedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  canEdit={canEdit}
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
                  dueDate={newTaskDueDate}
                  setDueDate={setNewTaskDueDate}
                  assignees={newTaskAssignees}
                  setAssignees={setNewTaskAssignees}
                  projectMembers={projectMembers}
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
  dueDate,
  setDueDate,
  assignees,
  setAssignees,
  projectMembers,
  onCancel,
  onSubmit,
}: any) {
  const TypeIcon = typeIcons[type] || CheckSquare;

  return (
    <div className="flex items-center gap-3 p-3 pl-4 animate-in fade-in bg-blue-50/50">
      <div className="relative">
        <button className="p-1 hover:bg-neutral-200 rounded">
          <TypeIcon className="w-4 h-4 text-neutral-600" />
        </button>
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

      {/* Due Date Picker */}
      <div className="flex items-center gap-2">
        <div className="relative flex border border-neutral-200 rounded-md bg-white items-center px-2 py-1">
          <CalendarIcon className="w-3 h-3 text-neutral-400 mr-2" />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="text-xs focus:outline-none bg-transparent cursor-pointer text-neutral-600 leading-none h-5"
          />
        </div>

        {/* Assignees Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 border border-neutral-200 rounded-md bg-white px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50 h-7 transition-colors">
              <User className="w-3 h-3 text-neutral-400" />
              {assignees.length === 0 ? "Assign" : `${assignees.length} assigned`}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <div className="text-xs font-semibold text-neutral-500 mb-2 px-1">Assign Members</div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {projectMembers?.map((m: UserType) => {
                const isSelected = assignees.some((a: UserType) => a.id === m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setAssignees((prev: UserType[]) =>
                        isSelected ? prev.filter(a => a.id !== m.id) : [...prev, m]
                      );
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

        <Button size="sm" onClick={onSubmit} className="h-7 px-3 text-xs ml-1">Add</Button>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onClick,
  onUpdate,
  onDelete,
  canEdit,
}: {
  task: Task;
  onClick: () => void;
  onUpdate: (t: Task) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
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
      draggable={canEdit}
      onDragStart={(e) => {
        if (!canEdit) return;
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="flex items-center p-3 pl-4 hover:bg-neutral-50 group cursor-pointer transition-colors border-l-[3px] border-transparent hover:border-neutral-300"
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
        <div onClick={(e) => e.stopPropagation()}>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="p-1 hover:bg-neutral-200 rounded text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Task</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this task? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(task.id)} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

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
