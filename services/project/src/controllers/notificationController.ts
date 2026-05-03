import { Request, Response } from "express";
import mongoose from "mongoose";
import { AuthRequest, Notification } from "@loopy/shared";
import type { NotificationCategory } from "@loopy/shared";
import { sseSubscribe, sseUnsubscribe } from "../lib/sseHub.js";
import {
  dispatchToUsers,
  getPMRecipientIds,
  type DispatchInput,
} from "../services/notificationDispatch.js";

export const streamNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).end();
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  (res as Response & { flushHeaders?: () => void }).flushHeaders?.();

  sseSubscribe(userId, res);
  res.write(`event: connected\ndata: {}\n\n`);

  const ping = setInterval(() => {
    try {
      res.write(`event: ping\ndata: {}\n\n`);
    } catch {
      clearInterval(ping);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(ping);
    sseUnsubscribe(userId, res);
  });
};

export const listNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const workspaceId = req.user!.workspaceId as string | undefined;
    if (!workspaceId) {
      res.status(200).json({ notifications: [], unreadCount: 0 });
      return;
    }

    const category = req.query.category as string | undefined;
    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
    };
    if (
      category === "task" ||
      category === "meeting" ||
      category === "update"
    ) {
      filter.category = category;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(120)
      .lean();

    const unreadCount = await Notification.countDocuments({
      ...filter,
      read: false,
    });

    res.json({ notifications, unreadCount });
  } catch (e: unknown) {
    console.error("[listNotifications]", e);
    res.status(500).json({ message: "Failed to load notifications" });
  }
};

export const unreadCount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const workspaceId = req.user!.workspaceId as string | undefined;
    if (!workspaceId) {
      res.json({ unreadCount: 0 });
      return;
    }
    const n = await Notification.countDocuments({
      userId: new mongoose.Types.ObjectId(req.user!.id),
      workspaceId: new mongoose.Types.ObjectId(workspaceId),
      read: false,
    });
    res.json({ unreadCount: n });
  } catch {
    res.status(500).json({ message: "Failed" });
  }
};

export const markNotificationRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = await Notification.findOneAndUpdate(
      {
        _id: id,
        userId: req.user!.id,
      },
      { read: true },
      { new: true }
    ).lean();
    if (!doc) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    res.json(doc);
  } catch {
    res.status(500).json({ message: "Failed" });
  }
};

export const markAllRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const workspaceId = req.user!.workspaceId as string | undefined;
    if (!workspaceId) {
      res.json({ updated: 0 });
      return;
    }
    const r = await Notification.updateMany(
      { userId: req.user!.id, workspaceId, read: false },
      { read: true }
    );
    res.json({ updated: r.modifiedCount });
  } catch {
    res.status(500).json({ message: "Failed" });
  }
};

/** Meeting service: notify workspace/project leadership about a scheduled meeting. */
export const internalMeetingPM = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { workspaceId, projectId, title, body, metadata, dedupeKey } =
      req.body as Record<string, unknown>;
    if (
      !workspaceId ||
      !projectId ||
      typeof title !== "string" ||
      typeof body !== "string"
    ) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }
    const pms = await getPMRecipientIds(
      String(workspaceId),
      String(projectId),
      []
    );
    if (!pms.length) {
      res.json({ ok: true, sent: 0 });
      return;
    }
    await dispatchToUsers({
      workspaceId: String(workspaceId),
      userIds: pms,
      category: "meeting",
      kind: "PM_MEETING_SCHEDULED",
      title,
      body,
      metadata:
        metadata && typeof metadata === "object"
          ? (metadata as Record<string, unknown>)
          : undefined,
      dedupeKey: dedupeKey ? String(dedupeKey) : undefined,
    });
    res.json({ ok: true, sent: pms.length });
  } catch (e: unknown) {
    console.error("[internalMeetingPM]", e);
    res.status(500).json({ message: "Failed" });
  }
};

export const internalDispatch = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = req.body as Partial<DispatchInput> & { userIds?: string[] };
    const userIds = body.userIds ?? [];
    if (
      !body.workspaceId ||
      !Array.isArray(userIds) ||
      !body.category ||
      !body.kind ||
      !body.title ||
      !body.body
    ) {
      res.status(400).json({ message: "Invalid payload" });
      return;
    }

    const ws = String(body.workspaceId);
    if (!mongoose.Types.ObjectId.isValid(ws)) {
      res.status(400).json({ message: "Invalid workspaceId" });
      return;
    }

    const rawIds = userIds.map(String);
    const validUserIds = rawIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (rawIds.length > 0 && validUserIds.length === 0) {
      res.status(400).json({ message: "No valid recipient user ids" });
      return;
    }

    const payload: DispatchInput = {
      workspaceId: ws,
      userIds: validUserIds,
      category: body.category as NotificationCategory,
      kind: String(body.kind),
      title: String(body.title),
      body: String(body.body),
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : undefined,
      dedupeKey: body.dedupeKey ? String(body.dedupeKey) : undefined,
    };

    await dispatchToUsers(payload);
    res.json({ ok: true });
  } catch (e: unknown) {
    console.error("[internalDispatch]", e);
    res.status(500).json({ message: "Dispatch failed" });
  }
};
