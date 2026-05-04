import mongoose, { Document, Model, Schema } from "mongoose";

// ── Enums ──────────────────────────────────────────────────────────────

export enum TranscriptionStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export enum ArtifactType {
  RECORDING = "RecordingArtifact",
  PROJECT_DOCUMENT = "ProjectDocumentArtifact",
  CHAT_ATTACHMENT = "ChatAttachmentArtifact",
}

// ── Interface ──────────────────────────────────────────────────────────

export interface IArtifact extends Document {
  artifactType?: ArtifactType | string;

  workspaceId?: mongoose.Types.ObjectId;
  folderId?: mongoose.Types.ObjectId;
  uploadedBy?: mongoose.Types.ObjectId;
  originalFilename?: string;
  r2Key?: string;
  mimeType?: string;
  sizeBytes?: number;
  currentVersionId?: mongoose.Types.ObjectId; // Reference to latest FileVersion

  projectId?: mongoose.Types.ObjectId;
  meetingId?: mongoose.Types.ObjectId;
  uploader?: mongoose.Types.ObjectId;

  storageKey?: string;
  filename?: string;

  recordingUrl?: string;

  /** Present on recording artifacts after transcript is available. */
  hasTranscript?: boolean;

  transcriptionStatus: TranscriptionStatus;
  transcriptJson?: Record<string, unknown>;
  summary?: string;
  error?: string;

  /** Parsed from minutes; host approves/rejects; see transcription service types. */
  actionProposals?: unknown[];

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────

const ArtifactSchema = new Schema<IArtifact>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
    },
    folderId: {
      type: Schema.Types.ObjectId,
      ref: "Folder",
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    originalFilename: { type: String, trim: true, maxlength: 255 },
    r2Key: { type: String, select: false, maxlength: 500, unique: true, sparse: true },
    mimeType: { type: String, maxlength: 127 },
    sizeBytes: { type: Number, min: 0 },
    currentVersionId: {
      type: Schema.Types.ObjectId,
      ref: "FileVersion",
      sparse: true,
    },

    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
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

    storageKey: { type: String, select: false, maxlength: 500 },
    filename: { type: String, trim: true, maxlength: 255 },

    recordingUrl: { type: String, select: false, maxlength: 2048 },

    transcriptionStatus: {
      type: String,
      enum: Object.values(TranscriptionStatus),
      default: TranscriptionStatus.PENDING,
    },
    transcriptJson: { type: Schema.Types.Mixed },
    summary: { type: String, maxlength: 50000 },
    error: { type: String, maxlength: 1000 },
    actionProposals: { type: [Schema.Types.Mixed], default: undefined },
  },
  { timestamps: true, discriminatorKey: "artifactType" }
);

ArtifactSchema.pre("validate", function () {
  if (!this.uploadedBy && this.uploader) this.uploadedBy = this.uploader;
  if (!this.uploader && this.uploadedBy) this.uploader = this.uploadedBy;
  if (!this.r2Key && this.storageKey) this.r2Key = this.storageKey;
  if (!this.storageKey && this.r2Key) this.storageKey = this.r2Key;
  if (!this.originalFilename && this.filename) this.originalFilename = this.filename;
  if (!this.filename && this.originalFilename) this.filename = this.originalFilename;
});

ArtifactSchema.index({ workspaceId: 1, folderId: 1, createdAt: -1 });
ArtifactSchema.index({ projectId: 1, createdAt: -1 });
ArtifactSchema.index({ uploader: 1, createdAt: -1 }, { sparse: true });
ArtifactSchema.index({ uploadedBy: 1, createdAt: -1 }, { sparse: true });
ArtifactSchema.index({ artifactType: 1, workspaceId: 1, createdAt: -1 });

export interface IRecordingArtifact extends IArtifact {
  artifactType: ArtifactType.RECORDING;
  meetingId: mongoose.Types.ObjectId;
  durationSeconds?: number;
  hasTranscript: boolean;
}

export interface IProjectDocumentArtifact extends IArtifact {
  artifactType: ArtifactType.PROJECT_DOCUMENT;
  projectId: mongoose.Types.ObjectId;
  taskId?: mongoose.Types.ObjectId;
  isCurrentlyLocked: boolean;
  lockedBy?: mongoose.Types.ObjectId;
}

export interface IChatAttachmentArtifact extends IArtifact {
  artifactType: ArtifactType.CHAT_ATTACHMENT;
  channelId: mongoose.Types.ObjectId;
  messageId?: mongoose.Types.ObjectId;
  isInlineImage: boolean;
}

const RecordingArtifactSchema = new Schema<IRecordingArtifact>({
  meetingId: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },
  durationSeconds: { type: Number, min: 0 },
  hasTranscript: { type: Boolean, default: false },
});

const ProjectDocumentArtifactSchema = new Schema<IProjectDocumentArtifact>({
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  taskId: { type: Schema.Types.ObjectId, ref: "Task" },
  isCurrentlyLocked: { type: Boolean, default: false },
  lockedBy: { type: Schema.Types.ObjectId, ref: "User" },
});

const ChatAttachmentArtifactSchema = new Schema<IChatAttachmentArtifact>({
  channelId: { type: Schema.Types.ObjectId, ref: "Channel", required: true },
  messageId: { type: Schema.Types.ObjectId, ref: "Message" },
  isInlineImage: { type: Boolean, default: false },
});

const Artifact =
  (mongoose.models.Artifact as Model<IArtifact>) ||
  mongoose.model<IArtifact>("Artifact", ArtifactSchema);

export const RecordingArtifact =
  (mongoose.models.RecordingArtifact as Model<IRecordingArtifact>) ||
  Artifact.discriminator<IRecordingArtifact>(
    ArtifactType.RECORDING,
    RecordingArtifactSchema
  );

export const ProjectDocumentArtifact =
  (mongoose.models.ProjectDocumentArtifact as Model<IProjectDocumentArtifact>) ||
  Artifact.discriminator<IProjectDocumentArtifact>(
    ArtifactType.PROJECT_DOCUMENT,
    ProjectDocumentArtifactSchema
  );

export const ChatAttachmentArtifact =
  (mongoose.models.ChatAttachmentArtifact as Model<IChatAttachmentArtifact>) ||
  Artifact.discriminator<IChatAttachmentArtifact>(
    ArtifactType.CHAT_ATTACHMENT,
    ChatAttachmentArtifactSchema
  );

export default Artifact;
