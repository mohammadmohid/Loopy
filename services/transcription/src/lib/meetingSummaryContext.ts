import mongoose, { Schema } from "mongoose";
import { User } from "@loopy/shared";

void User; // register User model for populate()

/** Read-only view of `meetings` collection for summary metadata (same DB as transcription). */
const meetingTxSchema = new Schema(
  {
    title: { type: String },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
    hostId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { collection: "meetings" }
);

type PopUser = {
  profile?: { firstName?: string; lastName?: string };
  email?: string;
} | null;

const MeetingTx =
  mongoose.models.MeetingTx || mongoose.model("MeetingTx", meetingTxSchema);

function displayName(u: PopUser): string {
  if (!u) return "Unknown";
  const fn = u.profile?.firstName?.trim() ?? "";
  const ln = u.profile?.lastName?.trim() ?? "";
  const full = `${fn} ${ln}`.trim();
  if (full) return full;
  return u.email?.trim() || "Unknown";
}

export type MeetingSummaryContext = {
  participantLines: string[];
  hostDisplayName: string;
  meetingTitle: string;
  /** Deepgram diarization index → name (0 = host, 1+ = invitees, skipping duplicate of host). */
  speakerDisplayNames: Record<number, string>;
};

export async function loadMeetingSummaryContext(
  meetingId: string
): Promise<MeetingSummaryContext> {
  const empty: MeetingSummaryContext = {
    participantLines: [],
    hostDisplayName: "",
    meetingTitle: "",
    speakerDisplayNames: {},
  };

  if (!meetingId || !mongoose.Types.ObjectId.isValid(meetingId)) {
    return empty;
  }

  const doc = (await MeetingTx.findById(meetingId)
    .populate("participants", "profile email")
    .populate("hostId", "profile email")
    .lean()) as {
    title?: string;
    participants?: PopUser[];
    hostId?: PopUser;
  } | null;

  if (!doc) return empty;

  const hostDisplayName = displayName(doc.hostId as PopUser);
  const participantLines = (doc.participants || [])
    .filter(Boolean)
    .map((p) => `- ${displayName(p as PopUser)}`);

  const speakerDisplayNames: Record<number, string> = {};
  const hostLabel = hostDisplayName.trim() || "Speaker 1";
  speakerDisplayNames[0] = hostLabel;
  let sp = 1;
  for (const p of doc.participants || []) {
    const name = displayName(p as PopUser).trim();
    if (!name || name === hostLabel) continue;
    speakerDisplayNames[sp] = name;
    sp += 1;
    if (sp > 24) break;
  }

  return {
    participantLines,
    hostDisplayName,
    meetingTitle: typeof doc.title === "string" ? doc.title : "",
    speakerDisplayNames,
  };
}

export type LeanMeetingForActions = {
  _id: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  hostId: mongoose.Types.ObjectId;
  participants?: mongoose.Types.ObjectId[];
  title?: string;
};

export async function findMeetingLeanForActions(
  meetingId: string
): Promise<LeanMeetingForActions | null> {
  if (!mongoose.Types.ObjectId.isValid(meetingId)) return null;
  const doc = await MeetingTx.findById(meetingId)
    .select("projectId hostId participants title")
    .lean();
  return doc as LeanMeetingForActions | null;
}

export async function assertUserIsMeetingHost(
  meetingId: string,
  userId: string
): Promise<LeanMeetingForActions> {
  const meeting = await findMeetingLeanForActions(meetingId);
  if (!meeting) {
    const err = new Error("Meeting not found") as Error & { status?: number };
    err.status = 404;
    throw err;
  }
  if (String(meeting.hostId) !== String(userId)) {
    const err = new Error("Only the meeting host can manage action items") as Error & {
      status?: number;
    };
    err.status = 403;
    throw err;
  }
  return meeting;
}
