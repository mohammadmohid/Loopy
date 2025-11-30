"use client";

import {
  CheckCircle2,
  Grid3X3,
  Pencil,
  Calendar,
  AlertCircle,
  Clock,
} from "lucide-react";
import { ProjectCalendar } from "./project-calendar";
import { TasksList } from "./tasks-list";
import type { Project, Task, Milestone, Activity } from "@/lib/types";

interface ProjectOverviewTabProps {
  project: Project;
  tasks: Task[];
  milestones: Milestone[];
  activities: Activity[];
  onTaskClick: (task: Task) => void;
  onActivityClick: (activity: Activity) => void;
  canEdit: boolean;
}

export function ProjectOverviewTab({
  project,
  tasks,
  milestones,
  activities,
  onTaskClick,
  onActivityClick,
  canEdit,
}: ProjectOverviewTabProps) {
  const statCards = [
    {
      label: "completed",
      value: project.stats.completed,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50",
    },
    {
      label: "created",
      value: project.stats.created,
      icon: Grid3X3,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      label: "updated",
      value: project.stats.updated,
      icon: Pencil,
      color: "text-indigo-500",
      bgColor: "bg-indigo-50",
    },
    {
      label: "due soon",
      value: project.stats.dueSoon,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-6 pb-4 border-b border-neutral-200">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-center gap-3 min-w-[150px] bg-white p-3 rounded-xl border border-neutral-100 shadow-sm"
            >
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-lg font-semibold text-neutral-900 leading-tight">
                  {stat.value}
                </p>
                <p className="text-xs text-neutral-400 capitalize">
                  {stat.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <ProjectCalendar tasks={tasks} milestones={milestones} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TasksList tasks={tasks} onTaskClick={onTaskClick} />
        </div>
        <div>
          {/* Recent Activity Section */}
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-neutral-200">
              <h3 className="font-semibold text-neutral-900">
                Recent Activity
              </h3>
            </div>
            <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 cursor-pointer hover:bg-neutral-50 p-2 rounded-lg transition-colors"
                  onClick={() => onActivityClick(activity)}
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 shrink-0 ${
                      activity.action === "completed"
                        ? "bg-emerald-500"
                        : "bg-blue-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-700">
                      <span className="font-medium">{activity.user}</span>{" "}
                      {activity.action}{" "}
                      <span className="font-medium">{activity.targetName}</span>
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-4">
                  No recent activity
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
