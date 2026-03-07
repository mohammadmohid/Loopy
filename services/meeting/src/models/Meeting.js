import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      required: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
    },
    projectId: {
      type: String,
      required: true,
    },
    projectName: {
      type: String,
      default: "Unknown Project"
    },
    participants: {
      type: [String], // Array of strings (emails or user IDs)
      default: [],
    },
    hostId: {
      type: String,
      // required: true, // Uncomment if you are passing the user ID from the frontend
    },
    hostName: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["scheduled", "active", "ended"],
      default: "active",
    },
    scheduledAt: {
      type: Date
    },
    recordingUrl: { type: String },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting;