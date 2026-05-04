/** Populated `hostId` from GET /api/meetings (lean JSON). */
export type PopulatedMeetingHost = {
  _id?: string;
  profile?: { firstName?: string; lastName?: string };
  email?: string;
};

export type MeetingHostSource = {
  hostName?: string;
  hostId?: string | PopulatedMeetingHost | null;
  participants?: string[];
};

export type UserForHostLookup = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

const HEX_OBJECT_ID = /^[a-fA-F0-9]{24}$/;

/**
 * Maps `GET /api/auth/users` payloads (`_id`, nested `profile`) into `{ id, firstName, lastName, email }`
 * for participant pickers and speaker / host resolution.
 */
export function normalizeAuthUsersForMeeting(raw: unknown): UserForHostLookup[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((u: Record<string, unknown>) => {
      const id = String(u?._id ?? u?.id ?? "").trim();
      const profile = u?.profile as { firstName?: string; lastName?: string } | undefined;
      return {
        id,
        email: typeof u?.email === "string" ? u.email : "",
        firstName: (profile?.firstName ?? u?.firstName) as string | undefined,
        lastName: (profile?.lastName ?? u?.lastName) as string | undefined,
      };
    })
    .filter((u) => HEX_OBJECT_ID.test(u.id));
}

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

/**
 * Best-effort map from Deepgram speaker index → display name.
 * Index `0` is labeled as the meeting host; `1..` follow invitees (excluding duplicate of host).
 * This cannot perfectly match voice clusters to people without extra signaling from the client.
 */
export function buildSpeakerIndexToDisplayName(
  meeting: MeetingHostSource | null | undefined,
  users: UserForHostLookup[] = []
): Record<number, string> {
  const host = resolveHostDisplayName(meeting, users);
  const map: Record<number, string> = { 0: host };

  const participants = meeting?.participants ?? [];

  let idx = 1;
  for (const pid of participants) {
    const idStr = String(pid);
    const u = users.find((x) => String(x.id) === idStr);
    const name =
      u != null
        ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email?.trim() || ""
        : "";
    if (!name || name === host) continue;
    map[idx] = name;
    idx += 1;
    if (idx > 24) break;
  }

  return map;
}
