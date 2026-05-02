import { randomUUID } from "node:crypto";

export type ActionProposalKind = "assign_task" | "schedule_meeting";

export type ActionProposalStatus = "pending" | "approved" | "rejected";

export interface ActionProposal {
  id: string;
  kind: ActionProposalKind;
  /** Short label for UI */
  title: string;
  /** Original bullet text */
  rawLine: string;
  assigneeNameHint?: string;
  status: ActionProposalStatus;
  createdAt: string;
  resolvedAt?: string;
}

/**
 * If the DB stores legacy JSON `{ overview, minutes }`, parse action items from `minutes`
 * (or combined fields); otherwise use the raw markdown string.
 */
export function normalizeSummaryMarkdownForActionParse(raw: string): string {
  const s = raw.trim();
  if (!s.startsWith("{")) return raw;

  try {
    const o = JSON.parse(s) as { minutes?: string; overview?: string };
    const minutes = typeof o.minutes === "string" ? o.minutes.trim() : "";
    const overview = typeof o.overview === "string" ? o.overview.trim() : "";
    if (minutes) return minutes;
    if (overview) return overview;
    return raw;
  } catch {
    return raw;
  }
}

/** Line-based: supports ### / ## and optional `**` around the title. */
export function extractActionItemsSection(markdown: string): string {
  const lines = markdown.trim().split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^#{1,6}\s*\*{0,2}\s*Action\s*items\*{0,2}\s*$/i.test(t)) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return "";

  const body: string[] = [];
  for (let j = start; j < lines.length; j++) {
    const raw = lines[j];
    const trimmed = raw.trimStart();
    if (/^#{1,6}(\s|$)/.test(trimmed)) {
      break;
    }
    body.push(raw);
  }
  return body.join("\n").trim();
}

function normalizeHint(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Best-effort assignee / name trailing the task line */
export function extractAssigneeHint(text: string): string | undefined {
  const trimmed = text.trim();
  const paren = /\(([^)]+)\)\s*$/.exec(trimmed);
  if (paren) {
    const inner = paren[1].trim();
    if (/^(assignee|owner)/i.test(inner)) {
      const parts = inner.split(/[:—-]/);
      const tail = parts[parts.length - 1]?.trim();
      if (tail) return tail;
    }
    if (inner.length <= 80 && !/\d{4}/.test(inner)) return inner;
  }

  const cleaned = trimmed.replace(/\s*\([^)]*\)\s*$/g, "").trim();

  const assigneeRe =
    /(?:assign(?:ee)?|owner)\s*[:—-]\s*([^,\n]+)/i.exec(cleaned);
  if (assigneeRe?.[1]) return assigneeRe[1].trim();

  const toRe =
    /\bto\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/.exec(cleaned);
  if (toRe?.[1]) return toRe[1].trim();

  const atRe = /@([A-Za-z][A-Za-z0-9_.-]{1,40})\b/.exec(cleaned);
  if (atRe?.[1]) return atRe[1].trim();

  const dashName = /[—–-]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/.exec(
    cleaned
  );
  if (dashName?.[1]) return dashName[1].trim();

  return undefined;
}

/** Strong signals for follow-up / calendar blocks (not work assignments). */
function classifyKind(text: string): ActionProposalKind {
  const raw = text.trim();
  const t = normalizeHint(raw);

  const meetingNoun =
    /\b(meetings?|sync|calls?|stand[- ]?ups?|check[- ]?ins?|sessions?|huddles?|touchpoints?)\b/.test(
      t
    );

  const schedulingVerb =
    /\b(schedule|scheduled|scheduling|book|booking|arrange|arranging|plan|planning|set\s*up|setup|calendar|reserve|slot)\b/.test(
      t
    );

  const timeHint =
    /\b(tomorrow|today|tonight|next\s+day|the\s+next\s+day|following\s+day|day\s+after|next\s+week|next\s+month|this\s+week)\b/.test(
      t
    ) ||
    /\b(mon(day)?|tue(sday)?|wed(nesday)?|thu(rsday)?|fri(day)?|sat(urday)?|sun(day)?)\b/.test(
      t
    ) ||
    /\d{4}-\d{2}-\d{2}/.test(t) ||
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(t);

  const taskLeadingVerb =
    /^\s*\[?\s*\]?\s*(ensure|fix|complete|implement|review|verify|write|update|debug|test|check that|document|prepare|send|share|upload|attach)\b/i.test(
      raw
    );

  // Explicit scheduling language
  if (schedulingVerb && meetingNoun) return "schedule_meeting";
  if (/\bfollow[- ]?up\b/.test(t) && meetingNoun) return "schedule_meeting";
  if (/\bcalendar\b/.test(t) && meetingNoun) return "schedule_meeting";
  if (
    /\b(meet\s+again|another\s+meeting|second\s+meeting|subsequent\s+meeting)\b/.test(
      t
    )
  )
    return "schedule_meeting";

  // Time + meeting-ish noun (e.g. "standup next day", "call tomorrow")
  const meetOrCallPlusTime =
    meetingNoun &&
    timeHint &&
    /\b(schedule|scheduled|book|next|tomorrow|follow[- ]?up|another|subsequent|later)\b/.test(
      t
    );

  if (meetOrCallPlusTime && !taskLeadingVerb) return "schedule_meeting";

  // "Meeting … tomorrow" / "tomorrow … sync" either order
  if (
    meetingNoun &&
    timeHint &&
    /\b(meeting|sync|call|stand[- ]?up)\b.*\b(tomorrow|next\s+day|following\s+day)\b|\b(tomorrow|next\s+day|following\s+day)\b.*\b(meeting|sync|call|stand[- ]?up)\b/.test(
      t
    ) &&
    !taskLeadingVerb
  ) {
    return "schedule_meeting";
  }

  // "To be scheduled … next day" without repeating "meeting"
  if (
    /\bto\s+be\s+scheduled\b/.test(t) ||
    /\bneed(s)?\s+to\s+be\s+scheduled\b/.test(t)
  ) {
    return "schedule_meeting";
  }

  return "assign_task";
}

/** Parse "## Action items" bullets into structured proposals (new IDs each run). */
export function parseActionProposalsFromSummary(markdown: string): ActionProposal[] {
  const normalized = normalizeSummaryMarkdownForActionParse(markdown);
  const section = extractActionItemsSection(normalized);
  if (!section) return [];

  const lines = section
    .split(/\n/)
    .map((l) => l.replace(/\r$/, "").trim())
    .filter(Boolean);

  const out: ActionProposal[] = [];
  for (const line of lines) {
    const bullet = line.match(
      /^(?:[-*+]|\d+\.)\s*(?:\[[^\]]*\]\s*)?(.+)$/
    );
    if (!bullet) continue;
    const rawLine = bullet[1].trim();
    if (!rawLine) continue;

    const kind = classifyKind(rawLine);
    const assigneeNameHint =
      kind === "assign_task" ? extractAssigneeHint(rawLine) : undefined;

    const title =
      rawLine.length > 240 ? `${rawLine.slice(0, 237)}…` : rawLine;

    out.push({
      id: randomUUID(),
      kind,
      title,
      rawLine,
      ...(assigneeNameHint ? { assigneeNameHint } : {}),
      status: "pending",
      createdAt: new Date().toISOString(),
    });
  }

  return out;
}
