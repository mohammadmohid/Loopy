import mongoose, { Schema, Document } from "mongoose";

export interface IArtifact extends Document {
  projectId: mongoose.Types.ObjectId;
  uploader: mongoose.Types.ObjectId;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  transcriptionStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  elevenLabsId?: string;
  transcriptText?: string;
  transcriptJson?: any; // Full ElevenLabs JSON response
  createdAt: Date;
}

const ArtifactSchema: Schema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    uploader: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Storage Metadata
    storageKey: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number },

    // Intelligence Metadata
    transcriptionStatus: {
      type: String,
      enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    elevenLabsId: { type: String },

    // The Data Payload
    transcriptText: { type: String },
    transcriptJson: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model<IArtifact>("Artifact", ArtifactSchema);
