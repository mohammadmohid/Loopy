import axios from "axios";

const DEV_INTERNAL_NOTIFICATION_SECRET = "dev-notification-secret";

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function formatWhen(d: Date | string | undefined | null): string {
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

function projectServiceBase(): string | null {
  const raw = process.env.PROJECT_SERVICE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (!isProduction()) return "http://127.0.0.1:5002";
  return null;
}

function internalSecret(): string | null {
  const env = process.env.INTERNAL_NOTIFICATION_SECRET?.trim();
  if (env) return env;
  if (!isProduction()) return DEV_INTERNAL_NOTIFICATION_SECRET;
  return null;
}

let loggedSkipReason = false;

async function post(path: string, body: Record<string, unknown>): Promise<void> {
  const base = projectServiceBase();
  const secret = internalSecret();
  if (!base || !secret) {
    if (!loggedSkipReason) {
      loggedSkipReason = true;
      console.warn(
        "[Meeting→notifications] Skipped: set PROJECT_SERVICE_URL (project API base, e.g. http://127.0.0.1:5002 or http://project:5002) and INTERNAL_NOTIFICATION_SECRET on the meeting service (must match the project service)."
      );
    }
    return;
  }
  try {
    const url = `${base}/api/notifications${path}`;
    await axios.post(url, body, {
      headers: { "x-loopy-notification-secret": secret },
      timeout: 8000,
    });
  } catch (e: unknown) {
    if (axios.isAxiosError(e)) {
      const status = e.response?.status;
      const data = e.response?.data;
      console.warn(
        "[Meeting→notifications] Dispatch failed:",
        status ?? e.code,
        typeof data === "object" ? JSON.stringify(data) : data ?? e.message
      );
    } else {
      console.warn("[Meeting→notifications]", e instanceof Error ? e.message : String(e));
    }
  }
}

export async function notifyMeetingParticipants(payload: {
  workspaceId: string;
  userIds: string[];
  kind: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
}): Promise<void> {
  if (!payload.userIds.length) return;
  await post("/internal/dispatch", {
    workspaceId: payload.workspaceId,
    userIds: payload.userIds,
    category: "meeting",
    kind: payload.kind,
    title: payload.title,
    body: payload.body,
    metadata: payload.metadata,
    dedupeKey: payload.dedupeKey,
  });
}

export async function notifyMeetingPM(payload: {
  workspaceId: string;
  projectId: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
}): Promise<void> {
  await post("/internal/meeting-pm", payload);
}

export { formatWhen };
