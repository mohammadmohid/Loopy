/** Populated `hostId` from GET /api/meetings (lean JSON). */
export type PopulatedMeetingHost = {
  _id?: string;
  profile?: { firstName?: string; lastName?: string };
  email?: string;
};

export type MeetingHostSource = {
  hostName?: string;
  hostId?: string | PopulatedMeetingHost | null;
};

export type UserForHostLookup = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

/**
 * Prefer legacy `hostName`, then populated `hostId`, then a lookup in `users` by host id.
 */
export function resolveHostDisplayName(
  meeting: MeetingHostSource | null | undefined,
  users: UserForHostLookup[] = []
): string {
  if (!meeting) return "Unknown";

  const legacy = meeting.hostName?.trim();
  if (legacy) return legacy;

  const h = meeting.hostId;
  if (h && typeof h === "object") {
    const p = h.profile;
    const fn = p?.firstName?.trim() ?? "";
    const ln = p?.lastName?.trim() ?? "";
    const full = `${fn} ${ln}`.trim();
    if (full) return full;
    if (h.email?.trim()) return h.email.trim();
  }

  const id =
    typeof h === "string"
      ? h
      : h && typeof h === "object" && "_id" in h && h._id != null
        ? String(h._id)
        : "";

  if (id && users.length > 0) {
    const u = users.find((x) => String(x.id) === id);
    if (u) {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
      if (name) return name;
      if (u.email?.trim()) return u.email.trim();
    }
  }

  return id ? "Unknown host" : "Unknown";
}
