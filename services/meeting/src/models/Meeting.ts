import mongoose, { Document, Schema } from "mongoose";

export interface IMeeting extends Document {
  roomName: string;
  title: string;
  projectId: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  hostId: mongoose.Types.ObjectId;
  status: "scheduled" | "active" | "ended";
  scheduledAt?: Date;
  recordingUrl?: string;
  /** Host-provided agenda (plain text / markdown); shown in UI and injected into meeting minutes — not AI-generated. */
  agenda?: string;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    roomName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    participants: [
      { type: Schema.Types.ObjectId, ref: "User" },
    ],
    hostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "ended"],
      default: "active",
    },
    scheduledAt: { type: Date },
    recordingUrl: { type: String },
    agenda: { type: String, trim: true, maxlength: 8000 },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────

// Meetings by project and status
meetingSchema.index({ projectId: 1, status: 1 });

// "My meetings" query: find({ hostId }) or find({ participants })
meetingSchema.index({ hostId: 1, createdAt: -1 });

const Meeting = mongoose.model<IMeeting>("Meeting", meetingSchema);

export default Meeting;