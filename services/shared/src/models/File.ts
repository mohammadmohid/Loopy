import mongoose, { Document, Schema } from "mongoose";

export enum FileSourceType {
  TASK = "TASK",
  CHAT_MESSAGE = "CHAT_MESSAGE",
  CHANNEL = "CHANNEL",
  CUSTOM = "CUSTOM",
  RECORDING = "RECORDING",
}

export interface IFilePermission {
  role: string; // workspace role: "OWNER", "MEMBER", "GUEST", "PROJECT_MANAGER"
  access: "VIEW" | "EDIT" | "DELETE";
}

export interface IFileSourceContext {
  type: FileSourceType;
  id?: mongoose.Types.ObjectId; // taskId, messageId, channelId, projectId
}

export interface IFile extends Document {
  workspaceId: mongoose.Types.ObjectId;
  folderId?: mongoose.Types.ObjectId;
  name: string;
  mimeType: string;
  sizeBytes: number;
  r2Key: string;
  uploadedBy: mongoose.Types.ObjectId;
  
  // Permissions and access control
  permissions: IFilePermission[];
  sourceContext: IFileSourceContext;
  
  // Version control
  currentVersionId?: mongoose.Types.ObjectId;
  isLocked: boolean;
  lockedBy?: mongoose.Types.ObjectId;
  lockedUntil?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const FilePermissionSchema = new Schema<IFilePermission>(
  {
    role: {
      type: String,
      required: true,
      enum: ["OWNER", "MEMBER", "GUEST", "PROJECT_MANAGER"],
    },
    access: {
      type: String,
      required: true,
      enum: ["VIEW", "EDIT", "DELETE"],
    },
  },
  { _id: false }
);

const FileSourceContextSchema = new Schema<IFileSourceContext>(
  {
    type: {
      type: String,
      required: true,
      enum: Object.values(FileSourceType),
    },
    id: {
      type: Schema.Types.ObjectId,
      sparse: true,
    },
  },
  { _id: false }
);

const FileSchema = new Schema<IFile>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    folderId: {
      type: Schema.Types.ObjectId,
      ref: "Folder",
      sparse: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    mimeType: {
      type: String,
      required: true,
      maxlength: 127,
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 0,
    },
    r2Key: {
      type: String,
      required: true,
      maxlength: 500,
      unique: true,
      sparse: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    permissions: [FilePermissionSchema],
    sourceContext: {
      type: FileSourceContextSchema,
      required: true,
    },
    currentVersionId: {
      type: Schema.Types.ObjectId,
      ref: "FileVersion",
      sparse: true,
    },
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    lockedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
    },
    lockedUntil: {
      type: Date,
      sparse: true,
    },
  },
  { timestamps: true }
);

// Indexes for common queries
FileSchema.index({ workspaceId: 1, folderId: 1, createdAt: -1 });
FileSchema.index({ uploadedBy: 1, createdAt: -1 });
FileSchema.index({ workspaceId: 1, "sourceContext.type": 1, "sourceContext.id": 1 });
// Index for finding locked files
FileSchema.index({ isLocked: 1, lockedUntil: 1 });

export default mongoose.models.File ||
  mongoose.model<IFile>("File", FileSchema);
