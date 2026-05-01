import mongoose, { Schema } from "mongoose";
import { User } from "@loopy/shared";

void User; // register User model for populate()

/** Read-only view of `meetings` collection for summary metadata (same DB as transcription). */
const meetingTxSchema = new Schema(
  {
    title: { type: String },
    agenda: { type: String },
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
  agenda: string;
  participantLines: string[];
  hostDisplayName: string;
  meetingTitle: string;
};

export async function loadMeetingSummaryContext(
  meetingId: string
): Promise<MeetingSummaryContext> {
  const empty: MeetingSummaryContext = {
    agenda: "",
    participantLines: [],
    hostDisplayName: "",
    meetingTitle: "",
  };

  if (!meetingId || !mongoose.Types.ObjectId.isValid(meetingId)) {
    return empty;
  }

  const doc = (await MeetingTx.findById(meetingId)
    .populate("participants", "profile email")
    .populate("hostId", "profile email")
    .lean()) as {
    title?: string;
    agenda?: string;
    participants?: PopUser[];
    hostId?: PopUser;
  } | null;

  if (!doc) return empty;

  const hostDisplayName = displayName(doc.hostId as PopUser);
  const participantLines = (doc.participants || [])
    .filter(Boolean)
    .map((p) => `- ${displayName(p as PopUser)}`);

  return {
    agenda: typeof doc.agenda === "string" ? doc.agenda : "",
    participantLines,
    hostDisplayName,
    meetingTitle: typeof doc.title === "string" ? doc.title : "",
  };
}
