import type { AppNotification } from "@/contexts/notifications-context";

const TASK_ROUTING_KINDS = new Set([
  "TASK_ASSIGNED",
  "TASK_DUE_UPDATED",
  "TASK_DUE_3D",
  "TASK_DUE_24H",
  "PM_TASK_ASSIGNED",
  "PM_TASK_COMPLETED",
]);

const OBJECT_ID_HEX = /^[a-f\d]{24}$/i;

function metadataProjectId(meta: Record<string, unknown> | undefined): string | null {
  const raw = meta?.projectId;
  if (typeof raw !== "string" || !OBJECT_ID_HEX.test(raw)) return null;
  return raw;
}

/**
 * Deep-link targets when the user opens a notification (slide-over).
 * Meeting alerts → upcoming meetings; task alerts → project backlog tab.
 */
export function getNotificationHref(
  n: Pick<AppNotification, "category" | "kind" | "metadata">
): string | null {
  const projectId = metadataProjectId(n.metadata);

  if (n.category === "meeting") {
    return "/meetings/upcoming";
  }

  const taskRelated =
    n.category === "task" || TASK_ROUTING_KINDS.has(n.kind);

  if (taskRelated && projectId) {
    return `/projects/${projectId}?tab=tasks`;
  }

  return null;
}
