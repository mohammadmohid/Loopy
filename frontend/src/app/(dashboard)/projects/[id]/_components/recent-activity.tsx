"use client";

import {
  FileText,
  Calendar,
  CheckSquare,
  Flag,
  Activity as ActivityIcon,
} from "lucide-react";
import type { Activity } from "@/lib/types";
import { cn } from "@/lib/utils";

const iconMap: Record<string, any> = {
  task: CheckSquare,
  milestone: Flag,
  project: FileText,
  default: ActivityIcon,
};

const actionColors: Record<string, string> = {
  created: "bg-blue-500",
  updated: "bg-amber-500",
  completed: "bg-emerald-500",
  deleted: "bg-red-500",
};

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-neutral-200 shrink-0">
        <h3 className="font-semibold text-neutral-900">Recent Activity</h3>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {activities.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-4">
            No recent activity recorded.
          </p>
        ) : (
          activities.map((activity) => {
            const Icon = iconMap[activity.type] || iconMap.default;
            const colorClass =
              actionColors[activity.action] || "bg-neutral-400";

            return (
              <div key={activity.id} className="flex items-start gap-3 group">
                <div className="relative mt-1">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full ring-4 ring-white group-hover:ring-neutral-50 transition-all",
                      colorClass
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-700 leading-snug">
                    <span className="font-medium text-neutral-900">
                      {activity.user}
                    </span>{" "}
                    <span className="text-neutral-500">{activity.action}</span>{" "}
                    <span className="font-medium text-neutral-900">
                      {activity.targetName}
                    </span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-400">
                    <Icon className="w-3 h-3" />
                    <span>
                      {new Date(activity.timestamp).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
