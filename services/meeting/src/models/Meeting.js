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
    participants: {
      type: [String], // Array of strings (emails or user IDs)
      default: [],
    },
    hostId: {
      type: String,
      // required: true, // Uncomment if you are passing the user ID from the frontend
    },
    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt
);

const Meeting = mongoose.model("Meeting", meetingSchema);

export default Meeting;