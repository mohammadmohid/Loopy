import mongoose from "mongoose";

/**
 * Read-only shape for meetings stored by the meeting service (same MongoDB).
 * Uses explicit collection name so it always maps to `meetings`.
 */
const meetingSchema = new mongoose.Schema(
  {
    title: { type: String },
    projectId: { type: String },
    projectName: { type: String },
    agenda: { type: String, default: "" },
    status: { type: String },
    roomName: { type: String },
    participants: [{ type: String }],
    hostId: { type: String },
    hostName: { type: String },
  },
  { collection: "meetings", timestamps: true }
);

export default mongoose.models.Meeting || mongoose.model("Meeting", meetingSchema);
