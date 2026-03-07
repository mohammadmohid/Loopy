import mongoose from "mongoose";

const artifactSchema = new mongoose.Schema({
  meetingId: { type: String, required: true, unique: true }, // One artifact per meeting
  projectId: { type: String, required: true },

  filename: { type: String },
  recordingUrl: { type: String },

  // ElevenLabs Status
  transcriptionStatus: {
    type: String,
    enum: ["pending", "processing", "COMPLETED", "FAILED"],
    default: "pending"
  },

  // The Data
  transcriptJson: { type: mongoose.Schema.Types.Mixed }, // Full JSON from ElevenLabs
  summary: { type: String }, // General Overview / Minutes combined
  overview: { type: String }, // Explicit Overview field
  agenda: [{ type: String }], // Optional: Extracted specific Agenda array

  chatHistory: [
    {
      role: { type: String, enum: ["user", "model"] },
      content: { type: String }
    }
  ],

  error: { type: String }
}, { timestamps: true });

export default mongoose.model("Artifact", artifactSchema);