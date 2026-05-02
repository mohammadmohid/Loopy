import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "@loopy/shared";
import { findByMeetingId } from "../repositories/artifactRepository.js";
import { assertUserIsMeetingHost } from "../lib/meetingSummaryContext.js";
import { resolveUserIdFromNameHint } from "../lib/resolveAssignee.js";
import type { ActionProposal } from "../lib/parseActionProposals.js";

export type TaskExecutionPayload = {
  projectId: string;
  title: string;
  description?: string;
  assignees: string[];
  type: "task";
  priority: "medium";
};

export type MeetingExecutionPayload = {
  projectId: string;
  title: string;
  participants: string[];
  scheduledAt?: string | null;
  agenda?: string;
};

function isProposal(x: unknown): x is ActionProposal {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    (p.kind === "assign_task" || p.kind === "schedule_meeting") &&
    typeof p.rawLine === "string" &&
    (p.status === "pending" ||
      p.status === "approved" ||
      p.status === "rejected")
  );
}

function stripAssigneeTail(raw: string): string {
  let t = raw.trim();
  const paren = /\s*\([^)]*\)\s*$/.exec(t);
  if (paren) t = t.slice(0, paren.index).trim();
  t = t.replace(/\s+(?:assignee|owner)\s*[:—-]\s*.+$/i, "").trim();
  t = t.replace(/\s+to\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s*$/i, "").trim();
  t = t.replace(/\s+[—–-]\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s*$/i, "").trim();
  return (t || raw.trim()).slice(0, 200);
}

/** Best-effort datetime for follow-up meetings from free text. */
export function suggestScheduledAtIso(rawLine: string): string | undefined {
  const line = rawLine.trim();
  const lower = line.toLowerCase();
  const now = Date.now();

  const nextDay =
    /\btomorrow\b/.test(lower) ||
    /\bnext\s+day\b/.test(lower) ||
    /\bthe\s+next\s+day\b/.test(lower) ||
    /\bfollowing\s+day\b/.test(lower) ||
    /\bday\s+after\b/.test(lower);

  if (nextDay) {
    return new Date(now + 86400000).toISOString();
  }
  if (/\bnext\s+week\b/.test(lower)) {
    return new Date(now + 7 * 86400000).toISOString();
  }

  const isoDay = line.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoDay) {
    const d = new Date(`${isoDay[1]}T15:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  const us = line.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) {
    const d = new Date(Number(us[3]), Number(us[1]) - 1, Number(us[2]), 15);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  return undefined;
}

function candidateObjectIds(
  hostId: string,
  participantIds: string[]
): mongoose.Types.ObjectId[] {
  const ids = [hostId, ...participantIds];
  const uniq = [...new Set(ids.map(String))];
  return uniq.map((id) => new mongoose.Types.ObjectId(id));
}

function gatewayAuthHeaders(req: AuthRequest): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (req.headers.cookie) {
    headers.Cookie = req.headers.cookie;
  } else if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }
  return headers;
}

/** Run task / meeting creation through the API gateway using the host's session. */
async function executeApprovedProposal(
  req: AuthRequest,
  execution: {
    tasks?: TaskExecutionPayload[];
    meetings?: MeetingExecutionPayload[];
  }
): Promise<void> {
  const base = (process.env.GATEWAY_URL || "http://localhost:8000").replace(
    /\/$/,
    ""
  );

  const headers = gatewayAuthHeaders(req);

  if (execution.tasks?.[0]) {
    const t = execution.tasks[0];
    const res = await fetch(`${base}/api/projects/${t.projectId}/tasks`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: t.title,
        description: t.description,
        assignees: t.assignees,
        type: t.type,
        priority: t.priority,
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(j.message || `Task could not be created (${res.status})`);
    }
  }

  if (execution.meetings?.[0]) {
    const m = execution.meetings[0];
    const body: Record<string, unknown> = {
      projectId: m.projectId,
      title: m.title,
      participants: m.participants,
    };
    if (m.agenda) body.agenda = m.agenda;
    if (m.scheduledAt) body.scheduledAt = m.scheduledAt;

    const res = await fetch(`${base}/api/meetings`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(j.message || `Meeting could not be created (${res.status})`);
    }
  }
}

export const approveActionProposal = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { meetingId, proposalId } = req.params;
    const userId = req.user?.id as string | undefined;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    const meeting = await assertUserIsMeetingHost(meetingId, userId);
    const artifact = await findByMeetingId(meetingId);
    if (!artifact) {
      res.status(404).json({ message: "Artifact not found" });
      return;
    }

    const proposals = (artifact.actionProposals ?? []) as unknown[];
    const idx = proposals.findIndex((p) => isProposal(p) && p.id === proposalId);
    if (idx === -1) {
      res.status(404).json({ message: "Proposal not found" });
      return;
    }

    const proposal = proposals[idx] as ActionProposal;
    if (proposal.status !== "pending") {
      res.status(400).json({ message: "Proposal already resolved" });
      return;
    }

    const projectIdStr = String(meeting.projectId ?? artifact.projectId);
    const hostStr = String(meeting.hostId);
    const participantStrs = (meeting.participants ?? []).map((id) => String(id));
    const candidates = candidateObjectIds(hostStr, participantStrs);

    let execution: {
      tasks?: TaskExecutionPayload[];
      meetings?: MeetingExecutionPayload[];
    } = {};

    if (proposal.kind === "assign_task") {
      let assigneeId: string | null = null;
      const hint = proposal.assigneeNameHint?.trim();
      if (hint) {
        assigneeId = await resolveUserIdFromNameHint(hint, candidates);
        if (!assigneeId) {
          res.status(400).json({
            message: `Could not match "${hint}" to a meeting participant. Edit the minutes or fix the name.`,
          });
          return;
        }
      } else {
        assigneeId = hostStr;
      }

      const title = stripAssigneeTail(proposal.rawLine);
      execution.tasks = [
        {
          projectId: projectIdStr,
          title,
          description: `From meeting action item:\n\n${proposal.rawLine}`,
          assignees: [assigneeId],
          type: "task",
          priority: "medium",
        },
      ];
    } else {
      let when = suggestScheduledAtIso(proposal.rawLine);
      if (!when) {
        when = new Date(Date.now() + 86400000).toISOString();
      }

      // Full roster from the source meeting (host + invitees), deduped.
      const rosterIds = [
        ...new Set([hostStr, ...participantStrs.map(String)]),
      ].filter(Boolean);

      const followUpTitle =
        proposal.title.length > 200
          ? `${proposal.title.slice(0, 197)}…`
          : proposal.title;

      execution.meetings = [
        {
          projectId: projectIdStr,
          title: followUpTitle.startsWith("Follow-up:")
            ? followUpTitle
            : `Follow-up: ${followUpTitle}`,
          participants: rosterIds,
          scheduledAt: when,
          agenda: `Scheduled from a prior meeting action item.\n\n${proposal.rawLine}`,
        },
      ];
    }

    try {
      await executeApprovedProposal(req, execution);
    } catch (execErr: unknown) {
      const msg =
        execErr instanceof Error ? execErr.message : "Could not complete this action";
      res.status(502).json({ message: msg });
      return;
    }

    proposal.status = "approved";
    proposal.resolvedAt = new Date().toISOString();
    artifact.markModified("actionProposals");
    await artifact.save();

    const artifactObj = artifact.toObject ? artifact.toObject() : { ...artifact };
    res.status(200).json({ artifact: artifactObj });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    if (e.status === 403 || e.status === 404) {
      res.status(e.status).json({ message: e.message });
      return;
    }
    console.error("[ActionProposal] approve error:", err);
    res.status(500).json({ message: "Failed to approve proposal" });
  }
};

export const rejectActionProposal = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { meetingId, proposalId } = req.params;
    const userId = req.user?.id as string | undefined;
    if (!userId) {
      res.status(401).json({ message: "Not authorized" });
      return;
    }

    await assertUserIsMeetingHost(meetingId, userId);
    const artifact = await findByMeetingId(meetingId);
    if (!artifact) {
      res.status(404).json({ message: "Artifact not found" });
      return;
    }

    const proposals = (artifact.actionProposals ?? []) as unknown[];
    const idx = proposals.findIndex((p) => isProposal(p) && p.id === proposalId);
    if (idx === -1) {
      res.status(404).json({ message: "Proposal not found" });
      return;
    }

    const proposal = proposals[idx] as ActionProposal;
    if (proposal.status !== "pending") {
      res.status(400).json({ message: "Proposal already resolved" });
      return;
    }

    proposal.status = "rejected";
    proposal.resolvedAt = new Date().toISOString();
    artifact.markModified("actionProposals");
    await artifact.save();

    const artifactObj = artifact.toObject ? artifact.toObject() : { ...artifact };
    res.status(200).json({ artifact: artifactObj });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    if (e.status === 403 || e.status === 404) {
      res.status(e.status).json({ message: e.message });
      return;
    }
    console.error("[ActionProposal] reject error:", err);
    res.status(500).json({ message: "Failed to reject proposal" });
  }
};
