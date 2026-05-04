import mongoose from "mongoose";
import Task from "../models/Task.js";
import Project from "../models/Project.js";
import cron from "node-cron";
import {
  dispatchToUsers,
  getPMRecipientIds,
  formatWhen,
  formatTaskTypeLabel,
} from "../services/notificationDispatch.js";

/** Normalize meeting participant / host ids from Mongo documents. */
function meetingUserIdStrings(ids: unknown[]): string[] {
  const out = new Set<string>();
  for (const raw of ids) {
    if (raw == null) continue;
    const s = String(raw);
    if (mongoose.Types.ObjectId.isValid(s)) out.add(s);
  }
  return [...out];
}

function utcDayStart(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export async function runMeetingReminders(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) return;

  const col = db.collection("meetings");
  const now = new Date();

  const startToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const endToday = new Date(startToday.getTime() + 86400000);

  const scheduledToday = await col
    .find({
      status: "scheduled",
      scheduledAt: { $gte: startToday, $lt: endToday },
    })
    .toArray();

  for (const m of scheduledToday) {
    const pid = String(m.projectId ?? "");
    if (!mongoose.Types.ObjectId.isValid(pid)) continue;
    const proj = await Project.findById(pid).select("workspaceId").lean();
    if (!proj) continue;
    const ws = String(proj.workspaceId);
    const title = typeof m.title === "string" ? m.title : "Meeting";
    const when = formatWhen(m.scheduledAt as Date);
    const recipientList = meetingUserIdStrings([
      ...(m.hostId ? [m.hostId] : []),
      ...((m.participants as unknown[]) || []),
    ]);

    await dispatchToUsers({
      workspaceId: ws,
      userIds: recipientList,
      category: "meeting",
      kind: "MEETING_TODAY",
      title: "Meeting today",
      body: `"${title}" is scheduled for today (${when}).`,
      metadata: { meetingId: String(m._id), projectId: pid },
      dedupeKey: `meet-today-${String(m._id)}-${startToday.toISOString().slice(0, 10)}`,
    });
  }

  const hourEnd = new Date(now.getTime() + 60 * 60 * 1000);
  const soon = await col
    .find({
      status: "scheduled",
      scheduledAt: { $gt: now, $lte: hourEnd },
    })
    .toArray();

  for (const m of soon) {
    const pid = String(m.projectId ?? "");
    if (!mongoose.Types.ObjectId.isValid(pid)) continue;
    const proj = await Project.findById(pid).select("workspaceId").lean();
    if (!proj) continue;
    const ws = String(proj.workspaceId);
    const title = typeof m.title === "string" ? m.title : "Meeting";
    const when = formatWhen(m.scheduledAt as Date);
    const recipientList = meetingUserIdStrings([
      ...(m.hostId ? [m.hostId] : []),
      ...((m.participants as unknown[]) || []),
    ]);

    const sch = new Date(m.scheduledAt as Date);
    const dedupeHour = sch.toISOString().slice(0, 13);

    await dispatchToUsers({
      workspaceId: ws,
      userIds: recipientList,
      category: "meeting",
      kind: "MEETING_1H",
      title: "Meeting starting soon",
      body: `"${title}" starts in about an hour (${when}).`,
      metadata: { meetingId: String(m._id), projectId: pid },
      dedupeKey: `meet-1h-${String(m._id)}-${dedupeHour}`,
    });
  }
}

export async function runTaskDueReminders(): Promise<void> {
  const now = new Date();
  const utcToday = utcDayStart(now);

  const tasks = await Task.find({
    dueDate: { $exists: true, $ne: null },
    status: { $ne: "done" },
  })
    .select("title dueDate assignees projectId type")
    .lean();

  for (const t of tasks) {
    if (!t.dueDate || !t.projectId) continue;
    const due = new Date(t.dueDate);
    const utcDue = utcDayStart(due);
    const dayDiff = Math.round((utcDue - utcToday) / 86400000);
    const pid = String(t.projectId);
    const proj = await Project.findById(pid).select("workspaceId name").lean();
    if (!proj) continue;
    const ws = String(proj.workspaceId);
    const assignees = [...new Set((t.assignees || []).map(String))].filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    const typeLabel = formatTaskTypeLabel(t.type as string | undefined);
    const typeLead = `[${typeLabel}] `;

    if (dayDiff === 3) {
      const recipients = [...new Set(assignees)];
      const pmExtra = await getPMRecipientIds(ws, pid, recipients);
      const all = [...new Set([...recipients, ...pmExtra])];
      await dispatchToUsers({
        workspaceId: ws,
        userIds: all,
        category: "task",
        kind: "TASK_DUE_3D",
        title: "Task due in 3 days",
        body: `${typeLead}"${t.title}" — deadline ${formatWhen(due)}.`,
        metadata: {
          taskId: String(t._id),
          projectId: pid,
          taskType: (t.type as string | undefined) ?? "task",
        },
        dedupeKey: `task-3d-${String(t._id)}-${utcDue}`,
      });
    }

    const msUntil = due.getTime() - now.getTime();
    if (msUntil > 0 && msUntil <= 24 * 60 * 60 * 1000) {
      const recipients = [...new Set(assignees)];
      const pmExtra = await getPMRecipientIds(ws, pid, recipients);
      const all = [...new Set([...recipients, ...pmExtra])];
      await dispatchToUsers({
        workspaceId: ws,
        userIds: all,
        category: "task",
        kind: "TASK_DUE_24H",
        title: "Task due within 24 hours",
        body: `${typeLead}"${t.title}" — deadline ${formatWhen(due)}.`,
        metadata: {
          taskId: String(t._id),
          projectId: pid,
          taskType: (t.type as string | undefined) ?? "task",
        },
        dedupeKey: `task-24h-${String(t._id)}-${utcDue}`,
      });
    }
  }
}

export async function runProjectDeadlineReminders(): Promise<void> {
  const now = new Date();
  const utcToday = utcDayStart(now);

  const projects = await Project.find({
    status: "active",
    endDate: { $exists: true, $ne: null },
  })
    .select("name endDate workspaceId")
    .lean();

  for (const p of projects) {
    if (!p.endDate) continue;
    const end = new Date(p.endDate);
    const utcEnd = utcDayStart(end);
    const dayDiff = Math.round((utcEnd - utcToday) / 86400000);
    if (dayDiff !== 3 && dayDiff !== 1) continue;

    const ws = String(p.workspaceId);
    const pms = await getPMRecipientIds(ws, String(p._id), []);
    if (!pms.length) continue;

    await dispatchToUsers({
      workspaceId: ws,
      userIds: pms,
      category: "update",
      kind: dayDiff === 1 ? "PROJECT_DEADLINE_1D" : "PROJECT_DEADLINE_3D",
      title: "Project deadline approaching",
      body: `"${p.name}" ends ${dayDiff === 1 ? "tomorrow" : "in 3 days"} (${formatWhen(end)}).`,
      metadata: { projectId: String(p._id) },
      dedupeKey: `proj-end-${String(p._id)}-${dayDiff}d-${utcEnd}`,
    });
  }
}

export function startNotificationReminderJobs(): void {
  cron.schedule("*/5 * * * *", async () => {
    try {
      await runMeetingReminders();
      await runTaskDueReminders();
      await runProjectDeadlineReminders();
    } catch (e) {
      console.error("[notificationReminders]", e);
    }
  });
  console.log("[notifications] Reminder cron scheduled (every 5 min)");
}
