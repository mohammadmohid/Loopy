"use client";

import { CheckCircle2, Grid3X3, Pencil, Calendar } from "lucide-react";
import { ProjectCalendar } from "./project-calendar";
import { TasksList } from "./tasks-list";
import { RecentActivity } from "./recent-activity";
import type { Project, Task, Milestone } from "@/lib/types";

interface ProjectOverviewTabProps {
  project: Project;
  tasks: Task[];
  milestones: Milestone[];
  onTaskClick: (task: Task) => void;
  canEdit: boolean;
}

export function ProjectOverviewTab({
  project,
  tasks,
  milestones,
  onTaskClick,
  canEdit,
}: ProjectOverviewTabProps) {
  const statCards = [
    {
      label: "completed",
      sublabel: "last 7 days",
      value: project.stats.completed,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
    },
    {
      label: "created",
      sublabel: "last 7 days",
      value: project.stats.created,
      icon: Grid3X3,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      label: "updated",
      sublabel: "last 7 days",
      value: project.stats.updated,
      icon: Pencil,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
    },
    {
      label: "due soon",
      sublabel: "next 7 days",
      value: project.stats.dueSoon,
      icon: Calendar,
      color: "text-rose-500",
      bgColor: "bg-rose-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats - compact row matching UI */}
      <div className="flex items-center gap-6 pb-4 border-b border-neutral-100">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-lg font-semibold text-neutral-900 leading-tight">
                  {stat.value} {stat.label}
                </p>
                <p className="text-xs text-neutral-400">{stat.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Calendar */}
      <ProjectCalendar tasks={tasks} milestones={milestones} />

      {/* Tasks and Recent Activity below calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TasksList tasks={tasks} onTaskClick={onTaskClick} />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
