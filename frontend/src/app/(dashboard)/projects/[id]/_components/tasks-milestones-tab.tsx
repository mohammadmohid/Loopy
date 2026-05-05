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
  Users,
  Milestone as MilestoneIcon,
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
  onMilestoneCreate: (milestone: any) => void;
  onMilestoneUpdate: (milestone: Milestone) => void;
  onMilestoneDelete: (milestoneId: string) => void;
  onMilestoneComplete?: (milestoneId: string) => void;
  onGroupUnassigned?: () => void;
  canEdit: boolean;
  canDelete: boolean;
  canEditTask?: (task: Task) => boolean;
  projectMembers?: UserType[];
  availableTeams?: any[];
}

const typeIcons: Record<string, any> = {
  task: CheckSquare,
  bug: Bug,
  feature: Lightbulb,
  story: BookOpen,
};

const typeColors: Record<string, string> = {
  task: "text-blue-600 bg-blue-50 border-blue-200",
  bug: "text-red-600 bg-red-50 border-red-200",
  feature: "text-amber-600 bg-amber-50 border-amber-200",
  story: "text-purple-600 bg-purple-50 border-purple-200",
};

const validateAndParseJSON = (jsonString: string): any => {
  try {
    const data = JSON.parse(jsonString);
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
  canEditTask,
  projectMembers = [],
  availableTeams = [],
}: TasksMilestonesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedMilestones, setExpandedMilestones] = useState<string[]>(
    milestones.map((m) => m.id)
  );

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const [creatingTaskIn, setCreatingTaskIn] = useState<string | "unassigned" | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState<TaskType>("task");
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>("");
  const [newTaskAssignees, setNewTaskAssignees] = useState<UserType[]>([]);

  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isMilestoneOverlayOpen, setIsMilestoneOverlayOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backlogExpanded, setBacklogExpanded] = useState(true);

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

  const activeMilestones = useMemo(
    () => milestones.filter((m) => m.status !== "completed"),
    [milestones]
  );

  const completedMilestones = useMemo(
    () => milestones
      .filter((m) => m.status === "completed")
      .sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      }),
    [milestones]
  );

  const unassignedTasks = useMemo(
    () => tasks.filter((t) => !t.milestoneId && matchesFilters(t)),
    [tasks, searchQuery, filterStatus, filterPriority]
  );

  const toggleMilestone = (id: string) => {
    setExpandedMilestones((prev) =>
      prev.includes(id) ? prev.filter((mid) => mid !== id) : [...prev, id]
    );
  };

  const handleDrop = async (e: React.DragEvent, milestoneId?: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.milestoneId === milestoneId) return;

    onTaskUpdate({ ...task, milestoneId });
  };

  const submitCreateTask = (milestoneId?: string) => {
    if (!newTaskTitle.trim()) return;
    onTaskCreate({
      title: newTaskTitle,
      type: newTaskType,
      dueDate: newTaskDueDate || undefined,
      milestoneId,
      assignees: newTaskAssignees,
    });
    setNewTaskTitle("");
    setNewTaskType("task");
    setNewTaskDueDate("");
    setNewTaskAssignees([]);
    setCreatingTaskIn(null);
  };

  const handleCreateMilestoneFromBacklog = () => {
    onMilestoneCreate({
      name: "New Milestone",
      tasks: unassignedTasks.map(t => t.id),
      startDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = validateAndParseJSON(content);
      if (parsed) {
        console.log("Parsed JSON:", parsed);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50/50">
      <div className="p-4 border-b border-neutral-200 bg-white space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search tasks or milestones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-xl border-neutral-200">
                <Upload className="w-4 h-4 mr-2" /> Import JSON
             </Button>
             <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileUpload} />
             {onGroupUnassigned && canEdit && (
                <Button variant="outline" size="sm" onClick={onGroupUnassigned} className="rounded-xl border-neutral-200">
                  <Users className="w-4 h-4 mr-2" /> Group Unassigned
                </Button>
             )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-8 max-w-6xl mx-auto">
          <div className="space-y-4">
            {activeMilestones.map((milestone) => {
              const progress = milestone.tasks?.length
                ? Math.round((milestone.tasks.filter((t) => t.status === "done").length / milestone.tasks.length) * 100)
                : 0;
              return (
                <div key={milestone.id} className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm group/ms">
                  <div className="p-4 bg-neutral-50/50 border-b border-neutral-200 flex items-center justify-between cursor-pointer select-none" onClick={() => toggleMilestone(milestone.id)}>
                    <div className="flex items-center gap-4">
                      <div className={cn("p-1.5 rounded-lg hover:bg-neutral-200 transition-all duration-200", !expandedMilestones.includes(milestone.id) && "-rotate-90 text-neutral-400", expandedMilestones.includes(milestone.id) && "text-primary bg-primary/5")}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                           <MilestoneIcon className="w-4 h-4 text-primary" />
                           <span className="font-bold text-neutral-900 group-hover/ms:text-primary transition-colors">{milestone.name}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <div className="w-32 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-tight">{progress}% Complete</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {onMilestoneComplete && milestone.status !== "completed" && (
                        <button onClick={(e) => { e.stopPropagation(); onMilestoneComplete(milestone.id); }} className="p-2 hover:bg-emerald-100 rounded-xl text-emerald-600 transition-all hover:scale-110 active:scale-95" title="Mark as completed">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setSelectedMilestone(milestone); setIsMilestoneOverlayOpen(true); }} className="p-2 hover:bg-neutral-200 rounded-xl text-neutral-500 transition-all">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {expandedMilestones.includes(milestone.id) && (
                    <div className="divide-y divide-neutral-100 min-h-[40px] bg-white animate-in slide-in-from-top-2 duration-200" onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onDrop={(e) => handleDrop(e, milestone.id)}>
                      {milestone.tasks?.filter(matchesFilters).map((task) => (
                        <TaskRow key={task.id} task={task} canEdit={canEditTask ? canEditTask(task) : canEdit} onClick={() => onTaskClick(task)} onUpdate={onTaskUpdate} onDelete={onTaskDelete} />
                      ))}
                      {creatingTaskIn === milestone.id ? (
                        <InlineCreateRow title={newTaskTitle} setTitle={setNewTaskTitle} type={newTaskType} setType={setNewTaskType} dueDate={newTaskDueDate} setDueDate={setNewTaskDueDate} assignees={newTaskAssignees} setAssignees={setNewTaskAssignees} projectMembers={projectMembers} availableTeams={availableTeams} onCancel={() => setCreatingTaskIn(null)} onSubmit={() => submitCreateTask(milestone.id)} />
                      ) : (
                        canEdit && <div onClick={() => setCreatingTaskIn(milestone.id)} className="flex items-center gap-3 p-4 pl-14 text-sm font-medium text-neutral-400 hover:text-primary hover:bg-primary/5 cursor-pointer transition-all border-t border-dashed border-neutral-100"><Plus className="w-4 h-4" /> Add a task to this milestone</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm group/backlog">
            <div className="p-4 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between cursor-pointer select-none" onClick={() => setBacklogExpanded(!backlogExpanded)}>
              <div className="flex items-center gap-4">
                <div className={cn("p-1.5 rounded-lg hover:bg-neutral-200 transition-all duration-200", !backlogExpanded && "-rotate-90 text-neutral-400", backlogExpanded && "text-blue-600 bg-blue-50")}>
                  <ChevronDown className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-neutral-900 group-hover/backlog:text-blue-600 transition-colors">Backlog (Unassigned Tasks)</span>
                  <span className="text-[10px] font-bold text-neutral-500 bg-neutral-200/50 px-2 py-0.5 rounded-md">{unassignedTasks.length}</span>
                </div>
              </div>
              {canEdit && unassignedTasks.length > 0 && (
                <button data-create-milestone-btn onClick={(e) => { e.stopPropagation(); handleCreateMilestoneFromBacklog(); }} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-xl transition-all border border-primary/10 hover:border-primary/20 shadow-sm"><Plus className="w-3.5 h-3.5" />Convert to Milestone</button>
              )}
            </div>
            {backlogExpanded && (
              <div className="divide-y divide-neutral-100 min-h-[50px] bg-white animate-in slide-in-from-top-2 duration-200" onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }} onDrop={(e) => handleDrop(e, undefined)}>
                {unassignedTasks.map((task) => (
                  <TaskRow key={task.id} task={task} canEdit={canEditTask ? canEditTask(task) : canEdit} onClick={() => onTaskClick(task)} onUpdate={onTaskUpdate} onDelete={onTaskDelete} />
                ))}
                {creatingTaskIn === "unassigned" ? (
                  <InlineCreateRow title={newTaskTitle} setTitle={setNewTaskTitle} type={newTaskType} setType={setNewTaskType} dueDate={newTaskDueDate} setDueDate={setNewTaskDueDate} assignees={newTaskAssignees} setAssignees={setNewTaskAssignees} projectMembers={projectMembers} availableTeams={availableTeams} onCancel={() => setCreatingTaskIn(null)} onSubmit={() => submitCreateTask()} />
                ) : (
                  canEdit && <div onClick={() => setCreatingTaskIn("unassigned")} className="flex items-center gap-3 p-4 pl-14 text-sm font-medium text-neutral-400 hover:text-blue-600 hover:bg-blue-50/50 cursor-pointer transition-all border-t border-dashed border-neutral-100"><Plus className="w-4 h-4" /> Create a backlog task</div>
                )}
              </div>
            )}
          </div>

          {completedMilestones.length > 0 && (
            <div className="pt-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-neutral-200" />
                <span className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em]">Archived & Completed</span>
                <div className="h-px flex-1 bg-neutral-200" />
              </div>
              <div className="space-y-4 opacity-70 hover:opacity-100 transition-opacity duration-300">
                {completedMilestones.map((milestone) => (
                  <div key={milestone.id} className="border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-50/50">
                    <div className="p-4 flex items-center justify-between cursor-pointer select-none" onClick={() => toggleMilestone(milestone.id)}>
                      <div className="flex items-center gap-4">
                        <div className={cn("p-1.5 rounded-lg hover:bg-neutral-200 transition-all duration-200", !expandedMilestones.includes(milestone.id) && "-rotate-90 text-neutral-400")}>
                          <ChevronDown className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-3">
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span className="font-semibold text-neutral-500 line-through decoration-neutral-300">{milestone.name}</span>
                          <span className="text-[10px] font-bold text-emerald-600/60 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider">Done</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-medium text-neutral-400 bg-white border border-neutral-100 px-2 py-1 rounded-lg">Closed {milestone.updatedAt ? new Date(milestone.updatedAt).toLocaleDateString() : ""}</span>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedMilestone(milestone); setIsMilestoneOverlayOpen(true); }} className="p-2 hover:bg-neutral-200 rounded-xl text-neutral-400 transition-all"><MoreVertical className="w-4 h-4" /></button>
                      </div>
                    </div>
                    {expandedMilestones.includes(milestone.id) && (
                      <div className="divide-y divide-neutral-100 bg-white/50 animate-in slide-in-from-top-2 duration-200">
                        {milestone.tasks?.filter(matchesFilters).map((task) => (
                          <TaskRow key={task.id} task={task} canEdit={false} onClick={() => onTaskClick(task)} onUpdate={onTaskUpdate} onDelete={onTaskDelete} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <MilestoneOverlay 
        isOpen={isMilestoneOverlayOpen} 
        onClose={() => setIsMilestoneOverlayOpen(false)} 
        milestone={selectedMilestone} 
        onUpdate={onMilestoneUpdate} 
        onDelete={onMilestoneDelete} 
        onTaskClick={onTaskClick}
        onTaskStatusChange={(taskId, status) => {
          const task = tasks.find(t => t.id === taskId);
          if (task) onTaskUpdate({ ...task, status });
        }}
        canEdit={canEdit} 
        canDelete={canEdit} 
        projectMembers={projectMembers}
        availableTeams={availableTeams}
      />
    </div>
  );
}

function InlineCreateRow({ title, setTitle, type, setType, dueDate, setDueDate, assignees, setAssignees, projectMembers, availableTeams, onCancel, onSubmit }: any) {
  const TypeIcon = typeIcons[type] || CheckSquare;
  const [typeOpen, setTypeOpen] = useState(false);
  const looksLikeUrl = (s: string) => /^https?:\/\//.test(s) || s.startsWith("/");
  return (
    <div className="flex items-center gap-3 p-3 pl-14 animate-in fade-in bg-blue-50/30 border-t border-dashed border-neutral-100">
      <Popover open={typeOpen} onOpenChange={setTypeOpen}>
        <PopoverTrigger asChild><button className="p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-neutral-200 transition-all"><TypeIcon className="w-4 h-4 text-neutral-600" /></button></PopoverTrigger>
        <PopoverContent className="w-36 p-1 rounded-xl shadow-xl border-neutral-200" align="start">
          {(["task", "bug", "feature", "story"] as TaskType[]).map((t) => {
            const Icon = typeIcons[t];
            return (<button key={t} onClick={() => { setType(t); setTypeOpen(false); }} className={cn("w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs capitalize transition-colors", type === t ? "bg-primary/10 text-primary font-bold" : "hover:bg-neutral-50 text-neutral-600")}><Icon className="w-3.5 h-3.5" />{t}</button>);
          })}
        </PopoverContent>
      </Popover>
      <input autoFocus className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400 font-medium" placeholder="What needs to be done?" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); if (e.key === "Escape") onCancel(); }} />
      <div className="flex items-center gap-2">
        <div className="relative flex border border-neutral-200 rounded-lg bg-white items-center px-2 py-1.5 hover:border-neutral-300 transition-all"><CalendarIcon className="w-3.5 h-3.5 text-neutral-400 mr-2" /><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="text-[11px] focus:outline-none bg-transparent cursor-pointer text-neutral-600 font-medium" /></div>
        <Popover>
          <PopoverTrigger asChild><button className="flex items-center gap-2 border border-neutral-200 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-medium text-neutral-600 hover:border-neutral-300 transition-all h-8"><User className="w-3.5 h-3.5 text-neutral-400" />{assignees.length === 0 ? "Assign" : `${assignees.length} Assigned`}</button></PopoverTrigger>
          <PopoverContent className="w-64 p-2 rounded-xl shadow-2xl border-neutral-200" align="end">
            <div className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-3 px-2 pt-1">Team Members</div>
            <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {projectMembers?.map((m: UserType) => {
                const isSelected = assignees.some((a: UserType) => a.id === m.id);
                return (<div key={m.id} onClick={() => { setAssignees((prev: UserType[]) => isSelected ? prev.filter(a => a.id !== m.id) : [...prev, m]); }} className={cn("flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all", isSelected ? "bg-primary/5" : "hover:bg-neutral-50")}><div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-all", isSelected ? "bg-primary border-primary" : "border-neutral-300")}>{isSelected && <Check className="w-3 h-3 text-white" />}</div><div className="w-6 h-6 bg-neutral-200 rounded-full flex items-center justify-center text-[10px] font-bold text-neutral-600 overflow-hidden shadow-sm">{m.avatar && looksLikeUrl(m.avatar) ? (<img src={m.avatar} alt={m.name} className="object-cover w-full h-full" />) : (m.avatar || m.name?.[0]?.toUpperCase() || "U")}</div><span className="text-xs font-medium text-neutral-700 truncate">{m.name}</span></div>)
              })}
            </div>
          </PopoverContent>
        </Popover>
        <Button size="sm" onClick={onSubmit} className="h-8 px-4 text-xs rounded-lg font-bold shadow-sm">Create</Button>
      </div>
    </div>
  );
}

function TaskRow({ task, onClick, onUpdate, onDelete, canEdit }: { task: Task; onClick: () => void; onUpdate: (t: Task) => void; onDelete: (id: string) => void; canEdit?: boolean; }) {
  const Icon = typeIcons[task.type] || CheckSquare;
  const isDone = task.status === "done";
  const looksLikeUrl = (s: string) => /^https?:\/\//.test(s) || s.startsWith("/");
  const statusColors: any = { done: "bg-emerald-50 text-emerald-700 border-emerald-100", "in-progress": "bg-blue-50 text-blue-700 border-blue-100", todo: "bg-neutral-50 text-neutral-600 border-neutral-100" };
  const priorityColor = { high: "bg-red-500", medium: "bg-amber-500", low: "bg-emerald-500" }[task.priority] || "bg-neutral-400";
  const now = new Date();
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < now && !isDone;
  const isClose = dueDate && dueDate > now && dueDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000 && !isDone;

  return (
    <div draggable={canEdit} onDragStart={(e) => { if (!canEdit) return; e.dataTransfer.setData("taskId", task.id); e.dataTransfer.effectAllowed = "move"; }} className="flex items-center p-3 pl-4 hover:bg-neutral-50/80 group transition-all duration-200 border-l-[4px] border-transparent hover:border-primary/40">
      <div className="flex items-center gap-4 w-12">
        <div className={cn("w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all", isDone ? "bg-emerald-500 border-emerald-500 text-white" : "border-neutral-300 hover:border-primary")} onClick={(e) => { e.stopPropagation(); if (canEdit) onUpdate({ ...task, status: isDone ? "todo" : "done" }); }}>{isDone && <Check className="w-3.5 h-3.5 font-bold" />}</div>
      </div>
      <div className={cn("p-1.5 rounded-lg border mr-3 shadow-sm", typeColors[task.type] || "text-neutral-600 bg-neutral-50 border-neutral-200")}><Icon className="w-3.5 h-3.5" /></div>
      <div className="w-16 text-[10px] text-neutral-400 font-black tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">LO-{task.id.slice(-4).toUpperCase()}</div>
      <div className="flex-1 flex items-center min-w-0 pr-4"><span className={cn("text-sm font-semibold truncate cursor-pointer transition-colors", isDone ? "line-through text-neutral-400" : "text-neutral-800 hover:text-primary")} onClick={onClick}>{task.title}</span></div>
      <div className="flex items-center gap-6 shrink-0">
        {(isOverdue || isClose) && (<div className={cn("flex items-center gap-1.5 text-[10px] font-bold border px-2 py-1 rounded-lg shadow-sm animate-pulse", isOverdue ? "bg-red-50 text-red-600 border-red-100" : "bg-amber-50 text-amber-600 border-amber-100")}><AlertTriangle className="w-3 h-3" />{isOverdue ? "OVERDUE" : "SOON"}</div>)}
        <div className="flex items-center gap-2"><span className={cn("px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-wider", statusColors[task.status] || statusColors.todo)}>{task.status.replace("-", " ")}</span><div className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm", priorityColor)} title={`Priority: ${task.priority}`} /></div>
        <div className="flex items-center -space-x-2 min-w-[60px] justify-end">
          {task.assignees && task.assignees.length > 0 ? (task.assignees.slice(0, 2).map((a, idx) => (<div key={a.id} className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-bold border-2 border-white shadow-sm overflow-hidden z-[1]" style={{ zIndex: 10 - idx }} title={a.name}>{a.avatar && looksLikeUrl(a.avatar) ? (<img src={a.avatar} alt={a.name} className="object-cover w-full h-full" />) : (a.avatar || a.name?.[0]?.toUpperCase() || "U")}</div>))) : (<div className="w-7 h-7 rounded-full bg-neutral-50 flex items-center justify-center text-[9px] font-bold text-neutral-400 border-2 border-dashed border-neutral-200">?</div>)}
          {task.assignees && task.assignees.length > 2 && (<div className="w-7 h-7 rounded-full bg-neutral-800 text-white flex items-center justify-center text-[8px] font-bold border-2 border-white z-0">+{task.assignees.length - 2}</div>)}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <AlertDialog>
            <AlertDialogTrigger asChild><button className="p-2 hover:bg-red-50 hover:text-red-600 rounded-xl text-neutral-400 transition-all"><X className="w-4 h-4" /></button></AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl border-neutral-200"><AlertDialogHeader><AlertDialogTitle>Delete Task</AlertDialogTitle><AlertDialogDescription className="text-neutral-500">This will permanently remove this task. You cannot undo this.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl border-neutral-200">Cancel</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(task.id)} className="bg-red-600 hover:bg-red-700 rounded-xl">Delete Permanently</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
