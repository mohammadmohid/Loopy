"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProjectOverviewTab } from "./_components/project-overview-tab";
import { TasksMilestonesTab } from "./_components/tasks-milestones-tab";
import { TimelineTab } from "./_components/timeline-tab";
import { BoardTab } from "./_components/board-tab";
import { TaskDetailPanel } from "./_components/task-detail-panel";
import { Users, MoreVertical, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  mockProject,
  mockTasks,
  mockMilestones,
  currentUser,
} from "@/lib/mock-data";
import type { Task, Milestone } from "@/lib/types";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "timeline", label: "Timeline" },
  { id: "tasks", label: "Tasks & Milestones" },
  { id: "board", label: "Board" },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState("overview");
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [milestones, setMilestones] = useState<Milestone[]>(mockMilestones);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(false);

  // Role-based permissions
  const canEdit =
    currentUser.role === "admin" ||
    currentUser.role === "project-manager" ||
    currentUser.role === "team-lead";
  const canDelete =
    currentUser.role === "admin" || currentUser.role === "project-manager";
  const canManageMembers =
    currentUser.role === "admin" || currentUser.role === "project-manager";

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskPanelOpen(true);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
    setSelectedTask(updatedTask);
  };

  const handleTaskCreate = (newTask: Task) => {
    setTasks((prev) => [...prev, newTask]);
  };

  const handleTaskDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setIsTaskPanelOpen(false);
    setSelectedTask(null);
  };

  const handleMilestoneUpdate = (updatedMilestone: Milestone) => {
    setMilestones((prev) =>
      prev.map((m) => (m.id === updatedMilestone.id ? updatedMilestone : m))
    );
  };

  const handleMilestoneCreate = (newMilestone: Milestone) => {
    setMilestones((prev) => [...prev, newMilestone]);
  };

  const handleMilestoneDelete = (milestoneId: string) => {
    setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/projects"
          className="text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          Projects
        </Link>
      </div>

      {/* Project Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: mockProject.color + "20" }}
          >
            <div
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: mockProject.color }}
            />
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {mockProject.name}
          </h1>
          {canManageMembers && (
            <button className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
              <Users className="w-5 h-5 text-neutral-500" />
            </button>
          )}
          <button className="p-2 hover:bg-neutral-100 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <Button variant="outline" className="gap-2 bg-transparent">
          <Folder className="w-4 h-4" />
          View all Files
        </Button>
      </div>

      {/* Project Meta */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-neutral-500 mb-1">Owner</p>
            <p className="font-medium text-neutral-900">
              {mockProject.owner.name}
            </p>
          </div>
          <div>
            <p className="text-neutral-500 mb-1">Start Date</p>
            <p className="font-medium text-neutral-900">
              {formatDate(mockProject.startDate)}
            </p>
          </div>
          <div>
            <p className="text-neutral-500 mb-1">End Date</p>
            <p className="font-medium text-neutral-900">
              {formatDate(mockProject.endDate)}
            </p>
          </div>
          <div>
            <p className="text-neutral-500 mb-1">Project Description</p>
            <p className="text-neutral-600">{mockProject.description}</p>
          </div>
        </div>
      </div>

      {/* Tabs - matching UI design */}
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

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "overview" && (
            <ProjectOverviewTab
              project={mockProject}
              tasks={tasks}
              milestones={milestones}
              onTaskClick={handleTaskClick}
              canEdit={canEdit}
            />
          )}

          {activeTab === "timeline" && (
            <TimelineTab
              milestones={milestones}
              tasks={tasks}
              onTaskClick={handleTaskClick}
              onMilestoneUpdate={handleMilestoneUpdate}
              onMilestoneDelete={handleMilestoneDelete}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          )}

          {activeTab === "tasks" && (
            <TasksMilestonesTab
              tasks={tasks}
              milestones={milestones}
              onTaskClick={handleTaskClick}
              onTaskCreate={handleTaskCreate}
              onTaskUpdate={handleTaskUpdate}
              onMilestoneCreate={handleMilestoneCreate}
              onMilestoneUpdate={handleMilestoneUpdate}
              onMilestoneDelete={handleMilestoneDelete}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          )}

          {activeTab === "board" && (
            <BoardTab
              tasks={tasks}
              onTaskClick={handleTaskClick}
              onTaskUpdate={handleTaskUpdate}
              canEdit={canEdit}
            />
          )}
        </div>
      </div>

      {/* Task Detail Side Panel */}
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
        canDelete={canDelete}
      />
    </div>
  );
}
