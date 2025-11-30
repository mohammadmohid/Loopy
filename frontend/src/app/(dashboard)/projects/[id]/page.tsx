"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProjectOverviewTab } from "./_components/project-overview-tab";
import { TasksMilestonesTab } from "./_components/tasks-milestones-tab";
import { TimelineTab } from "./_components/timeline-tab";
import { BoardTab } from "./_components/board-tab";
import { TaskDetailPanel } from "./_components/task-detail-panel";
import { UploadDialog } from "@/components/upload-dialog";
import { MoreVertical, Folder, UploadCloud, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-provider";
import type { Task, Milestone, Project, Activity, User } from "@/lib/types";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "timeline", label: "Timeline" },
  { id: "tasks", label: "Tasks & Milestones" },
  { id: "board", label: "Board" },
];

const mapUser = (u: any): User => ({
  id: u._id || u.id,
  name: u.profile
    ? `${u.profile.firstName} ${u.profile.lastName}`
    : u.name || "Unknown",
  email: u.email || "",
  avatar: u.profile ? u.profile.firstName[0] + u.profile.lastName[0] : "U",
  role: u.globalRole || "member",
});

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("overview");
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Derived Activity Feed (Mock implementation based on dates)
  const activities = useMemo(() => {
    const acts: Activity[] = [];
    tasks.forEach((t) => {
      acts.push({
        id: t.id + "_update",
        type: "task",
        action: t.status === "done" ? "completed" : "updated",
        targetName: t.title,
        targetId: t.id,
        user: t.assignee?.name || "Unknown",
        timestamp: t.updatedAt,
      });
    });
    return acts
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 10);
  }, [tasks]);

  const fetchData = useCallback(async () => {
    try {
      const [projectData, tasksData, milestonesData] = await Promise.all([
        apiRequest<any>(`/projects?id=${id}`),
        apiRequest<any[]>(`/projects/${id}/tasks`),
        apiRequest<any[]>(`/projects/${id}/milestones`),
      ]);

      const currentProjectRaw = Array.isArray(projectData)
        ? projectData.find((p: any) => p._id === id)
        : projectData;

      if (!currentProjectRaw) throw new Error("Project not found");

      const defaultColumns = [
        { id: "todo", label: "To Do", color: "bg-neutral-200", isLocked: true },
        {
          id: "in-progress",
          label: "In Progress",
          color: "bg-blue-500",
          isLocked: true,
        },
        { id: "done", label: "Done", color: "bg-emerald-500", isLocked: true },
      ];

      // Map Project
      const mappedProject: Project = {
        id: currentProjectRaw._id,
        name: currentProjectRaw.name,
        description: currentProjectRaw.description,
        startDate: currentProjectRaw.startDate,
        endDate: currentProjectRaw.endDate,
        color: currentProjectRaw.color || "#3B82F6",
        boardColumns:
          currentProjectRaw.boardColumns?.length > 0
            ? currentProjectRaw.boardColumns.map((c: any) => ({
                ...c,
                isLocked: ["todo", "in-progress", "done"].includes(c.id),
              }))
            : defaultColumns,
        owner: mapUser(currentProjectRaw.owner),
        members: currentProjectRaw.members.map((m: any) => ({
          ...mapUser(m.user),
          role: m.role,
        })),
        stats: { completed: 0, created: 0, updated: 0, dueSoon: 0 },
      };

      const mappedTasks: Task[] = tasksData.map((t) => {
        const { _id, assignees, ...rest } = t;
        return {
          ...rest,
          id: _id,
          assignees: assignees ? assignees.map(mapUser) : [],
          status: mappedProject.boardColumns.some((c) => c.id === t.status)
            ? t.status
            : mappedProject.boardColumns[0].id,
        };
      });

      const mappedMilestones: Milestone[] = milestonesData.map((m) => {
        const { _id, assignees, ...rest } = m;
        const milestoneTasks = mappedTasks.filter((t) => t.milestoneId === _id);

        // If no explicit assignees on milestone, aggregate from tasks
        let finalAssignees: User[] = [];
        if (assignees && assignees.length > 0) {
          finalAssignees = assignees.map(mapUser);
        } else {
          // Milestones by default tasks all the tasks assigned members
          const uniqueUsers = new Map();
          milestoneTasks.forEach((t) => {
            t.assignees.forEach((u) => uniqueUsers.set(u.id, u));
          });
          finalAssignees = Array.from(uniqueUsers.values());
        }

        return {
          ...rest,
          id: _id,
          assignees: finalAssignees,
          tasks: milestoneTasks,
        };
      });

      // Calculate Real Stats
      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(now.getDate() + 3);

      mappedProject.stats.completed = mappedTasks.filter(
        (t) => t.status === "done"
      ).length;
      mappedProject.stats.created = mappedTasks.length;
      mappedProject.stats.updated = mappedTasks.filter((t) => {
        const updated = new Date(t.updatedAt);
        const diffTime = Math.abs(now.getTime() - updated.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7; // Updated in last 7 days
      }).length;

      mappedProject.stats.dueSoon = mappedTasks.filter((t) => {
        if (!t.dueDate || t.status === "done") return false;
        const due = new Date(t.dueDate);
        return due >= now && due <= threeDaysFromNow;
      }).length;

      setProject(mappedProject);
      setTasks(mappedTasks);
      setMilestones(mappedMilestones);
    } catch (error) {
      console.error("Error loading project:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- CRUD Handlers ---
  const handleTaskCreate = async (newTask: Partial<Task>) => {
    try {
      const created = await apiRequest<any>(`/projects/${id}/tasks`, {
        method: "POST",
        data: newTask,
      });
      const task: Task = { ...created, id: created._id };
      setTasks((prev) => [...prev, task]);

      // Refresh milestones to update task counts if assigned
      if (newTask.milestoneId) {
        setMilestones((prev) =>
          prev.map((m) =>
            m.id === newTask.milestoneId
              ? { ...m, tasks: [...m.tasks, task] }
              : m
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTaskUpdate = async (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    if (selectedTask?.id === updatedTask.id) setSelectedTask(updatedTask);

    // Also update inside milestones
    setMilestones((prev) =>
      prev.map((m) => ({
        ...m,
        tasks: m.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
      }))
    );

    try {
      await apiRequest(`/projects/tasks/${updatedTask.id}`, {
        method: "PATCH",
        data: updatedTask,
      });
    } catch (e) {
      console.error(e);
      fetchData();
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    try {
      await apiRequest(`/projects/tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setMilestones((prev) =>
        prev.map((m) => ({
          ...m,
          tasks: m.tasks.filter((t) => t.id !== taskId),
        }))
      );
      setIsTaskPanelOpen(false);
      setSelectedTask(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMilestoneCreate = async (newMilestone: Partial<Milestone>) => {
    try {
      const created = await apiRequest<any>(`/projects/${id}/milestones`, {
        method: "POST",
        data: newMilestone,
      });
      setMilestones((prev) => [
        ...prev,
        { ...created, id: created._id, tasks: [] },
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMilestoneUpdate = async (updated: Milestone) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m))
    );
    try {
      await apiRequest(`/projects/milestones/${updated.id}`, {
        method: "PATCH",
        data: updated,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleMilestoneDelete = async (mId: string) => {
    try {
      await apiRequest(`/projects/milestones/${mId}`, { method: "DELETE" });
      setMilestones((prev) => prev.filter((m) => m.id !== mId));
      // Move tasks to unassigned in local state
      setTasks((prev) =>
        prev.map((t) =>
          t.milestoneId === mId ? { ...t, milestoneId: undefined } : t
        )
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleColumnsUpdate = async (newColumns: any[]) => {
    if (!project) return;
    const updatedProject = { ...project, boardColumns: newColumns };
    setProject(updatedProject);
    try {
      await apiRequest(`/projects/${id}`, {
        method: "PATCH",
        data: { boardColumns: newColumns },
      });
    } catch (e) {
      console.error("Failed to save columns", e);
    }
  };

  if (isLoading)
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin text-neutral-400" />
      </div>
    );
  if (!project) return <div>Project not found</div>;

  const canEdit =
    user?.globalRole === "ADMIN" || project.owner.id === user?.id || true;

  const handleActivityClick = (activity: Activity) => {
    if (activity.type === "task") {
      const task = tasks.find((t) => t.id === activity.targetId);
      if (task) {
        setSelectedTask(task);
        setIsTaskPanelOpen(true);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/projects"
          className="text-neutral-500 hover:text-neutral-700"
        >
          Projects
        </Link>
        <span className="text-neutral-300">/</span>
        <span className="text-neutral-900">{project.name}</span>
      </div>

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: project.color + "20" }}
          >
            <div
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: project.color }}
            />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {project.name}
          </h1>
          <button className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsUploadOpen(true)}
            className="gap-2 bg-primary"
          >
            <UploadCloud className="w-4 h-4" /> Upload Recording
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Folder className="w-4 h-4" /> Files
          </Button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden min-h-[600px] flex flex-col">
        <div className="border-b border-neutral-200 px-2">
          <div className="flex items-center">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-6 py-4 text-sm font-medium transition-colors relative",
                  activeTab === tab.id
                    ? "text-neutral-900"
                    : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 flex-1 bg-neutral-50/30">
          {activeTab === "overview" && (
            <ProjectOverviewTab
              project={project}
              tasks={tasks}
              activities={activities}
              milestones={milestones}
              onTaskClick={(t) => {
                setSelectedTask(t);
                setIsTaskPanelOpen(true);
              }}
              onActivityClick={handleActivityClick}
              canEdit={canEdit}
            />
          )}
          {activeTab === "timeline" && (
            <TimelineTab
              milestones={milestones}
              tasks={tasks}
              projectMembers={project.members} // Pass members for filter
              onTaskClick={(t) => {
                setSelectedTask(t);
                setIsTaskPanelOpen(true);
              }}
              onMilestoneUpdate={handleMilestoneUpdate}
              onMilestoneDelete={handleMilestoneDelete}
              canEdit={canEdit}
              canDelete={canEdit}
            />
          )}
          {activeTab === "tasks" && (
            <TasksMilestonesTab
              tasks={tasks}
              milestones={milestones}
              onTaskClick={(t) => {
                setSelectedTask(t);
                setIsTaskPanelOpen(true);
              }}
              onTaskCreate={handleTaskCreate}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              onMilestoneCreate={handleMilestoneCreate}
              onMilestoneUpdate={handleMilestoneUpdate}
              onMilestoneDelete={handleMilestoneDelete}
              canEdit={canEdit}
              canDelete={canEdit}
            />
          )}
          {activeTab === "board" && (
            <BoardTab
              tasks={tasks}
              columns={project.boardColumns}
              onTaskClick={(t) => {
                setSelectedTask(t);
                setIsTaskPanelOpen(true);
              }}
              onTaskUpdate={handleTaskUpdate}
              onColumnsUpdate={handleColumnsUpdate}
              canEdit={canEdit}
            />
          )}
        </div>
      </div>

      <UploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        projectId={id}
        onUploadComplete={fetchData}
      />

      <TaskDetailPanel
        task={selectedTask}
        isOpen={isTaskPanelOpen}
        onClose={() => {
          setIsTaskPanelOpen(false);
          setSelectedTask(null);
        }}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
        canEdit={canEdit}
        canDelete={canEdit}
      />
    </div>
  );
}
