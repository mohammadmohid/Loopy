"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
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
import type { Task, Milestone, Project } from "@/lib/types";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "timeline", label: "Timeline" },
  { id: "tasks", label: "Tasks & Milestones" },
  { id: "board", label: "Board" },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("overview");
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Fetch all data
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

      // Map Project
      const mappedProject: Project = {
        _id: currentProjectRaw._id,
        id: currentProjectRaw._id,
        name: currentProjectRaw.name,
        description: currentProjectRaw.description,
        startDate: currentProjectRaw.startDate,
        endDate: currentProjectRaw.endDate,
        color: currentProjectRaw.color || "#3B82F6",
        boardColumns:
          currentProjectRaw.boardColumns &&
          currentProjectRaw.boardColumns.length > 0
            ? currentProjectRaw.boardColumns
            : [
                { id: "todo", label: "To Do", color: "bg-neutral-200" },
                {
                  id: "in-progress",
                  label: "In Progress",
                  color: "bg-blue-500",
                },
                { id: "done", label: "Done", color: "bg-emerald-500" },
              ],
        owner: {
          id: currentProjectRaw.owner._id,
          name: `${currentProjectRaw.owner.profile?.firstName} ${currentProjectRaw.owner.profile?.lastName}`,
          email: currentProjectRaw.owner.email,
          avatar: "CU",
          role: "admin",
        },
        members: [],
        stats: { completed: 0, created: 0, updated: 0, dueSoon: 0 },
      };

      // Map Tasks with Dynamic Status Check
      const mappedTasks: Task[] = tasksData.map((t) => ({
        ...t,
        id: t._id,
        // If task status doesn't exist in current board columns, default to the first column
        status: mappedProject.boardColumns.some((c) => c.id === t.status)
          ? t.status
          : mappedProject.boardColumns[0].id,
      }));

      const mappedMilestones: Milestone[] = milestonesData.map((m) => ({
        ...m,
        id: m._id,
        tasks: mappedTasks.filter((t) => t.milestoneId === m._id),
      }));

      // Calculate Stats
      mappedProject.stats.completed = mappedTasks.filter(
        (t) => t.status === "done"
      ).length;
      mappedProject.stats.created = mappedTasks.length;

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
    } catch (e) {
      console.error(e);
    }
  };

  const handleTaskUpdate = async (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    if (selectedTask?.id === updatedTask.id) setSelectedTask(updatedTask);

    try {
      // FIX: Use /projects/tasks/:id because Gateway strips /api/projects
      // Service expects /tasks/:id
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
      // FIX: Use /projects/tasks/:id
      await apiRequest(`/projects/tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
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
      // FIX: Use /projects/milestones/:id
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
      // FIX: Use /projects/milestones/:id
      await apiRequest(`/projects/milestones/${mId}`, { method: "DELETE" });
      setMilestones((prev) => prev.filter((m) => m.id !== mId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleColumnsUpdate = async (newColumns: any[]) => {
    if (!project) return;
    const updatedProject = { ...project, boardColumns: newColumns };
    setProject(updatedProject);
    try {
      // Project update uses /projects/:id
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

  // Simple permission check
  const canEdit =
    user?.globalRole === "ADMIN" || project.owner.id === user?.id || true;

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
            <UploadCloud className="w-4 h-4" />
            Upload Recording
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent">
            <Folder className="w-4 h-4" />
            Files
          </Button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
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

        <div className="p-6">
          {activeTab === "overview" && (
            <ProjectOverviewTab
              project={project}
              tasks={tasks}
              milestones={milestones}
              onTaskClick={(t) => {
                setSelectedTask(t);
                setIsTaskPanelOpen(true);
              }}
              canEdit={canEdit}
            />
          )}
          {activeTab === "timeline" && (
            <TimelineTab
              milestones={milestones}
              tasks={tasks}
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
