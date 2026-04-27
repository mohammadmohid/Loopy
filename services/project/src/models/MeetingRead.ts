import mongoose, { Schema } from "mongoose";

/**
 * Read-only view of meeting service `meetings` collection for notification aggregation.
 */
const meetingReadSchema = new Schema(
  {
    title: String,
    status: String,
    scheduledAt: Date,
    hostId: String,
    hostName: String,
    participants: [String],
    projectId: String,
    workspaceId: String,
  },
  { collection: "meetings", strict: false }
);

export default mongoose.models.MeetingRead ||
  mongoose.model("MeetingRead", meetingReadSchema);
