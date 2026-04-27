import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth";
import Project from "../models/Project";
import Task from "../models/Task";
import Milestone from "../models/Milestone";
import MeetingRead from "../models/MeetingRead";

const NEW_ASSIGNMENT_WINDOW_MS = 72 * 3600000;
const DUE_SOON_DAYS = 7;
const MILESTONE_WINDOW_DAYS = 14;
const NEW_MEETING_SCHEDULE_WINDOW_MS = 72 * 3600000;
const MEETING_SOON_MS = 60 * 60 * 1000;

function calendarDayUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function meetingInWorkspace(
  m: Record<string, unknown>,
  workspaceIdStr: string,
  projectIdStrings: Set<string>
): boolean {
  const widRaw = m.workspaceId;
  const wid =
    widRaw != null && widRaw !== "" ? String(widRaw) : "";
  if (wid && wid === String(workspaceIdStr)) return true;
  const pidRaw = m.projectId;
  const pid = pidRaw != null ? String(pidRaw) : "";
  if (!wid && pid && projectIdStrings.has(pid)) return true;
  return false;
}

/**
 * Aggregated in-app notifications from tasks, milestones, and meetings (same MongoDB).
 * Meeting reminders are evaluated at request time (open panel / poll): day-of and ≤1h before.
 */
export const getMyNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const workspaceId = req.user!.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace" });
    }

    const uid = new mongoose.Types.ObjectId(userId);
    const wsOid = new mongoose.Types.ObjectId(String(workspaceId));

    const projects = await Project.find({ workspaceId: wsOid }).select("_id name").lean();
    const projectIds = projects.map((p) => p._id);
    const projectIdSet = new Set(projects.map((p) => String(p._id)));
    const projectNameById = new Map(projects.map((p) => [String(p._id), p.name]));

    if (!projectIds.length) {
      return res.json({ notifications: [] });
    }

    const notifications: Array<{
      id: string;
      kind: string;
      title: string;
      body: string;
      href: string;
      at: string;
      priority: number;
    }> = [];

    const now = Date.now();
    const todayUtc = calendarDayUtc(new Date());

    const tasks = await Task.find({
      projectId: { $in: projectIds },
      assignees: uid,
      status: { $ne: "done" },
    })
      .select("title dueDate updatedAt createdAt projectId")
      .lean();

    for (const t of tasks) {
      const pid = String(t.projectId);
      const pname = projectNameById.get(pid) || "Project";

      if (now - new Date(t.createdAt).getTime() < NEW_ASSIGNMENT_WINDOW_MS) {
        notifications.push({
          id: `task-assigned-${String(t._id)}`,
          kind: "task_assigned",
          title: "New task",
          body: `You have a new task "${t.title}" in ${pname}.`,
          href: `/projects/${pid}`,
          at: new Date(t.createdAt).toISOString(),
          priority: 3,
        });
      }

      if (t.dueDate) {
        const due = new Date(t.dueDate);
        const msUntilDue = due.getTime() - now;
        const daysUntil = msUntilDue / 86400000;
        if (daysUntil <= DUE_SOON_DAYS && daysUntil >= -1) {
          const label =
            msUntilDue < 0
              ? "overdue"
              : msUntilDue < 86400000
                ? "due today"
                : `due in ${Math.ceil(daysUntil)} day(s)`;
          notifications.push({
            id: `task-due-${String(t._id)}-${calendarDayUtc(due)}`,
            kind: "task_due",
            title: "Task deadline",
            body: `"${t.title}" (${pname}) is ${label}.`,
            href: `/projects/${pid}`,
            at: due.toISOString(),
            priority: msUntilDue < 0 ? 5 : 2,
          });
        }
      }
    }

    const milestones = await Milestone.find({
      projectId: { $in: projectIds },
      assignees: uid,
      status: "open",
    })
      .select("name dueDate projectId")
      .lean();

    for (const m of milestones) {
      const due = new Date(m.dueDate);
      const days = (due.getTime() - now) / 86400000;
      if (days <= MILESTONE_WINDOW_DAYS && days >= -3) {
        const pid = String(m.projectId);
        const pname = projectNameById.get(pid) || "Project";
        notifications.push({
          id: `milestone-${String(m._id)}-${calendarDayUtc(due)}`,
          kind: "milestone_due",
          title: "Milestone",
          body: `"${m.name}" in ${pname} — due ${due.toLocaleDateString()}.`,
          href: `/projects/${pid}`,
          at: due.toISOString(),
          priority: 2,
        });
      }
    }

    const meetings = await MeetingRead.find({
      status: "scheduled",
      scheduledAt: { $exists: true, $ne: null },
      $or: [{ hostId: String(userId) }, { participants: String(userId) }],
    })
      .select("title scheduledAt hostName hostId createdAt projectId workspaceId")
      .lean();

    for (const m of meetings) {
      if (!meetingInWorkspace(m, String(workspaceId), projectIdSet)) continue;

      const sched = new Date(m.scheduledAt as Date);
      if (Number.isNaN(sched.getTime())) continue;

      const mid = String(m._id);
      const host = (m.hostName as string) || "Host";
      const title = (m.title as string) || "Meeting";
      const schedLabel = sched.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

      const createdMs = new Date((m as any).createdAt || sched).getTime();
      if (now - createdMs < NEW_MEETING_SCHEDULE_WINDOW_MS) {
        notifications.push({
          id: `meeting-scheduled-${mid}`,
          kind: "meeting_scheduled",
          title: "Meeting scheduled",
          body: `${host} has scheduled "${title}" for ${schedLabel}.`,
          href: `/meetings/${mid}`,
          at: new Date((m as any).createdAt || sched).toISOString(),
          priority: 2,
        });
      }

      const schedDay = calendarDayUtc(sched);
      if (schedDay === todayUtc) {
        notifications.push({
          id: `meeting-day-${mid}-${todayUtc}`,
          kind: "meeting_day",
          title: "Meeting today",
          body: `You have "${title}" today at ${sched.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })} (host: ${host}).`,
          href: `/meetings/${mid}`,
          at: sched.toISOString(),
          priority: 4,
        });
      }

      const msUntil = sched.getTime() - now;
      if (msUntil > 0 && msUntil <= MEETING_SOON_MS) {
        const mins = Math.max(1, Math.round(msUntil / 60000));
        const hoursPart = mins >= 60 ? `${Math.floor(mins / 60)} hr ` : "";
        const minsPart = mins % 60 === 0 && mins >= 60 ? "" : `${mins % 60 || mins} min`;
        notifications.push({
          id: `meeting-soon-${mid}`,
          kind: "meeting_soon",
          title: "Meeting starting soon",
          body: `You have a meeting in ${hoursPart}${minsPart}: "${title}" with ${host}.`,
          href: `/meetings/${mid}`,
          at: new Date(now).toISOString(),
          priority: 5,
        });
      }
    }

    notifications.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    );

    res.json({ notifications });
  } catch (error: any) {
    console.error("[Notifications]", error);
    res.status(500).json({ message: error.message || "Failed to load notifications" });
  }
};
