import mongoose, { Document, Schema } from "mongoose";

// ── Enums ──────────────────────────────────────────────────────────────

export enum TranscriptionStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

// ── Interface ──────────────────────────────────────────────────────────

export interface IArtifact extends Document {
  projectId: mongoose.Types.ObjectId;
  meetingId?: mongoose.Types.ObjectId;
  uploader?: mongoose.Types.ObjectId;

  // Storage (user-uploaded files)
  storageKey?: string;
  filename?: string;
  mimeType?: string;
  sizeBytes?: number;

  // Recording (meeting recordings)
  recordingUrl?: string;

  // Transcription
  transcriptionStatus: TranscriptionStatus;
  transcriptJson?: Record<string, unknown>;
  summary?: string;
  error?: string;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────

const ArtifactSchema = new Schema<IArtifact>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: "Meeting",
      sparse: true,
      unique: true,
    },
    uploader: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Storage
    storageKey: { type: String, select: false, maxlength: 500 },
    filename: { type: String, trim: true, maxlength: 255 },
    mimeType: { type: String, maxlength: 127 },
    sizeBytes: { type: Number, min: 0 },

    // Recording
    recordingUrl: { type: String, select: false, maxlength: 2048 },

    // Transcription
    transcriptionStatus: {
      type: String,
      enum: Object.values(TranscriptionStatus),
      default: TranscriptionStatus.PENDING,
    },
    transcriptJson: { type: Schema.Types.Mixed },
    summary: { type: String, maxlength: 50000 },
    error: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────

// List artifacts by project, sorted by recency
ArtifactSchema.index({ projectId: 1, createdAt: -1 });

// User's uploaded artifacts
ArtifactSchema.index({ uploader: 1, createdAt: -1 }, { sparse: true });

export default mongoose.models.Artifact ||
  mongoose.model<IArtifact>("Artifact", ArtifactSchema);
