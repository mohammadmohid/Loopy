"use client";

import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { X, Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useNotifications,
  type NotificationFilter,
} from "@/contexts/notifications-context";
import { getNotificationHref } from "@/lib/notification-navigation";
import { cn } from "@/lib/utils";

const TASK_TYPE_LABELS: Record<string, string> = {
  task: "Task",
  bug: "Bug",
  feature: "Feature",
  story: "Story",
};

const filters: { id: NotificationFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "task", label: "Tasks" },
  { id: "meeting", label: "Meetings" },
  { id: "update", label: "Updates" },
];

export function NotificationSlideOver() {
  const router = useRouter();
  const {
    panelOpen,
    setPanelOpen,
    filteredNotifications,
    filter,
    setFilter,
    markRead,
    markAllRead,
  } = useNotifications();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    if (panelOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen, setPanelOpen]);

  if (!panelOpen) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 bg-black/35 z-[55] transition-opacity"
        aria-label="Close notifications"
        onClick={() => setPanelOpen(false)}
      />

      <aside
        className={cn(
          "fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[60]",
          "flex flex-col border-l border-neutral-200 animate-in slide-in-from-right duration-200"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-neutral-600" />
            <h2 className="text-lg font-semibold text-neutral-900">
              Notifications
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-neutral-600"
              onClick={() => void markAllRead()}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-500"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-3 py-2 border-b border-neutral-100 flex gap-2 flex-wrap shrink-0">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                filter === f.id
                  ? "bg-[#cc2233] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 text-sm">
              No notifications yet.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {filteredNotifications.map((n) => (
                <li key={n._id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors",
                      !n.read && "bg-[#fdf6f7]/80",
                      getNotificationHref(n) && "cursor-pointer"
                    )}
                    onClick={() => {
                      void markRead(n._id);
                      const href = getNotificationHref(n);
                      if (href) {
                        setPanelOpen(false);
                        router.push(href);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-neutral-900 text-sm">
                            {n.title}
                          </p>
                          {typeof n.metadata?.taskType === "string" &&
                          n.metadata.taskType.trim() !== "" ? (
                            <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600">
                              {TASK_TYPE_LABELS[n.metadata.taskType] ??
                                n.metadata.taskType}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-neutral-600 mt-0.5 whitespace-pre-wrap">
                          {n.body}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-1.5 uppercase tracking-wide">
                          {n.category} ·{" "}
                          {formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="mt-1 w-2 h-2 rounded-full bg-[#cc2233] shrink-0" />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
