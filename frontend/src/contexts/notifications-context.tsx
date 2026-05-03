"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-provider";

export type NotificationFilter = "all" | "task" | "meeting" | "update";

export interface AppNotification {
  _id: string;
  category: string;
  kind: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

type NotificationsContextValue = {
  notifications: AppNotification[];
  unreadCount: number;
  filter: NotificationFilter;
  setFilter: (f: NotificationFilter) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  filteredNotifications: AppNotification[];
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [panelOpen, setPanelOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await apiRequest<{
        notifications: AppNotification[];
        unreadCount: number;
      }>("/notifications");
      setNotifications(data.notifications ?? []);
      setUnreadCount(
        typeof data.unreadCount === "number"
          ? data.unreadCount
          : (data.notifications ?? []).filter((n) => !n.read).length
      );
    } catch {
      /* non-blocking */
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!user?.id) return;

    const es = new EventSource("/api/notifications/stream");

    es.addEventListener("notification", (ev) => {
      try {
        const raw = JSON.parse((ev as MessageEvent).data) as {
          notification?: AppNotification;
        };
        const n = raw.notification;
        if (!n?._id) return;
        setNotifications((prev) => {
          const had = prev.some((x) => x._id === n._id);
          const rest = prev.filter((x) => x._id !== n._id);
          if (!had && !n.read) {
            setUnreadCount((c) => c + 1);
          }
          return [n, ...rest];
        });
      } catch {
        /* ignore malformed events */
      }
    });

    return () => es.close();
  }, [user?.id]);

  const togglePanel = useCallback(() => {
    setPanelOpen((p) => !p);
  }, []);

  const markRead = useCallback(async (id: string) => {
    let wasUnread = false;
    setNotifications((prev) =>
      prev.map((n) => {
        if (n._id === id && !n.read) wasUnread = true;
        return n._id === id ? { ...n, read: true } : n;
      })
    );
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await apiRequest(`/notifications/${id}/read`, { method: "PATCH" });
    } catch {
      void refresh();
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await apiRequest("/notifications/read-all", { method: "POST", data: {} });
    } catch {
      void refresh();
    }
  }, [refresh]);

  const filteredNotifications = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => n.category === filter);
  }, [notifications, filter]);

  const value = useMemo(
    (): NotificationsContextValue => ({
      notifications,
      unreadCount,
      filter,
      setFilter,
      panelOpen,
      setPanelOpen,
      togglePanel,
      refresh,
      markRead,
      markAllRead,
      filteredNotifications,
    }),
    [
      notifications,
      unreadCount,
      filter,
      panelOpen,
      togglePanel,
      refresh,
      markRead,
      markAllRead,
      filteredNotifications,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
