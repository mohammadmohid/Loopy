import mongoose from "mongoose";
import {
  Notification,
  Workspace,
  type NotificationCategory,
} from "@loopy/shared";
import Project from "../models/Project.js";
import { sseEmit } from "../lib/sseHub.js";

export type DispatchInput = {
  workspaceId: string;
  userIds: string[];
  category: NotificationCategory;
  kind: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  /** Per-recipient dedupe base (user id is appended internally). */
  dedupeKey?: string;
};

export async function getWorkspaceLeadershipUserIds(
  workspaceId: string,
  projectId?: string
): Promise<string[]> {
  const ids = new Set<string>();

  const wsLean = await Workspace.findById(workspaceId).select("members").lean();
  const ws = wsLean as {
    members?: Array<{ user: mongoose.Types.ObjectId; role: string }>;
  } | null;
  for (const m of ws?.members ?? []) {
    if (m.role === "ADMIN" || m.role === "PROJECT_MANAGER") {
      ids.add(String(m.user));
    }
  }

  if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
    const proj = await Project.findById(projectId).select("owner members").lean();
    if (proj) {
      ids.add(String(proj.owner));
      for (const mem of proj.members ?? []) {
        if (mem.role === "MANAGER") ids.add(String(mem.user));
      }
    }
  }

  return [...ids];
}

/** Leadership recipients excluding listed user ids (e.g. actor / already notified assignees). */
export async function getPMRecipientIds(
  workspaceId: string,
  projectId: string | undefined,
  excludeUserIds: string[] = []
): Promise<string[]> {
  const ex = new Set(excludeUserIds.map(String));
  const leaders = await getWorkspaceLeadershipUserIds(workspaceId, projectId);
  return leaders.filter((id) => !ex.has(id));
}

export async function dispatchToUsers(input: DispatchInput): Promise<void> {
  const {
    workspaceId,
    userIds,
    category,
    kind,
    title,
    body,
    metadata,
    dedupeKey,
  } = input;

  const unique = [...new Set(userIds.map(String).filter(Boolean))];
  if (!unique.length) return;
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    console.warn("[dispatchToUsers] Invalid workspaceId; skipping.", workspaceId);
    return;
  }

  for (const userId of unique) {
    const key = dedupeKey ? `${dedupeKey}:${userId}` : undefined;
    try {
      const doc = await Notification.create({
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        userId: new mongoose.Types.ObjectId(userId),
        category,
        kind,
        title,
        body,
        metadata,
        dedupeKey: key,
      });
      const plain = doc.toObject();
      sseEmit(userId, "notification", { notification: plain });
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      if (code === 11000) continue;
      console.error("[dispatchToUsers]", err);
    }
  }
}

export function formatWhen(d: Date | string | undefined | null): string {
  if (d == null) return "Time TBD";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return String(d);
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(dt);
  } catch {
    return dt.toISOString();
  }
}
