"use client";

import { FileText, Calendar, CheckSquare } from "lucide-react";

const iconMap = {
  file: FileText,
  calendar: Calendar,
  check: CheckSquare,
  message: FileText,
};

export function RecentActivity() {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-neutral-200">
        <h3 className="font-semibold text-neutral-900">Recent Activity</h3>
      </div>

      <div className="p-4 space-y-4">
        {mockActivities.map((activity) => {
          const Icon = iconMap[activity.icon];
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div
                className={`w-2 h-2 rounded-full mt-2 shrink-0 ${activity.color}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-neutral-700">
                  {activity.user && (
                    <span className="font-medium">{activity.user} </span>
                  )}
                  {activity.action}
                  {activity.target && (
                    <span className="font-medium"> {activity.target}</span>
                  )}
                </p>
                {activity.type === "task" && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500">
                    <CheckSquare className="w-3 h-3" />
                    <span>{activity.target}</span>
                  </div>
                )}
                <p className="text-xs text-neutral-400 mt-1">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
