"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Bell, Calendar, Flag, ListTodo, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type InboxNotification = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  at: string;
  priority: number;
};

type NotificationSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function kindIcon(kind: string) {
  switch (kind) {
    case "task_assigned":
    case "task_due":
      return ListTodo;
    case "milestone_due":
      return Flag;
    case "meeting_scheduled":
    case "meeting_day":
    case "meeting_soon":
      return Calendar;
    default:
      return Bell;
  }
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotificationSidebar({
  open,
  onOpenChange,
}: NotificationSidebarProps) {
  const [items, setItems] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiRequest<{ notifications: InboxNotification[] }>(
      "/projects/notifications/inbox"
    )
      .then((data) => {
        if (!cancelled) setItems(data.notifications ?? []);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Could not load notifications"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className={cn(
          "bg-white",
          "fixed inset-y-0 right-0 left-auto top-0 z-50 flex h-full w-full max-w-md translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-y-0 border-r-0 border-l p-0 shadow-xl duration-300 sm:max-w-md",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right",
          "data-[state=open]:zoom-in-100 data-[state=closed]:zoom-out-100"
        )}
      >
        <DialogHeader className="shrink-0 border-b border-neutral-200 px-4 py-4 text-left">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg font-semibold text-neutral-900">
              Notifications
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onOpenChange(false)}
              aria-label="Close notifications"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12 text-neutral-500">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          {!loading && error && (
            <p className="px-4 py-6 text-sm text-red-600">{error}</p>
          )}
          {!loading && !error && items.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-neutral-500">
              You&apos;re all caught up. No notifications right now.
            </p>
          )}
          {!loading && !error && items.length > 0 && (
            <ul className="divide-y divide-neutral-100">
              {items.map((n) => {
                const Icon = kindIcon(n.kind);
                return (
                  <li key={n.id}>
                    <Link
                      href={n.href}
                      onClick={() => onOpenChange(false)}
                      className="flex gap-3 px-4 py-3 transition-colors hover:bg-neutral-50"
                    >
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-900">
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-sm leading-snug text-neutral-600">
                          {n.body}
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                          {formatWhen(n.at)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
