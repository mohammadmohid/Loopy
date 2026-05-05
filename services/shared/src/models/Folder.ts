import mongoose, { Document, Schema } from "mongoose";

export enum SystemFolderContext {
  MEETINGS = "MEETINGS",
  PROJECTS = "PROJECTS",
  CHAT = "CHAT",
}

export enum FolderEntityType {
  PROJECT = "PROJECT",
  CHANNEL = "CHANNEL",
  MEETING_CHANNEL = "MEETING_CHANNEL",
}

export interface IFolder extends Document {
  workspaceId: mongoose.Types.ObjectId;
  name: string;
  parentId?: mongoose.Types.ObjectId | null;
  isSystem: boolean;
  systemContext?: SystemFolderContext;
  sourceEntityId?: mongoose.Types.ObjectId;
  sourceEntityType?: FolderEntityType;
  createdAt: Date;
  updatedAt: Date;
}

const FolderSchema = new Schema<IFolder>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
    systemContext: {
      type: String,
      enum: Object.values(SystemFolderContext),
      required(this: IFolder) {
        return this.isSystem && !this.parentId;
      },
    },
    sourceEntityId: {
      type: Schema.Types.ObjectId,
      sparse: true,
    },
    sourceEntityType: {
      type: String,
      enum: Object.values(FolderEntityType),
      sparse: true,
    },
  },
  { timestamps: true }
);

FolderSchema.index({ workspaceId: 1, parentId: 1, name: 1 }, { unique: true });
FolderSchema.index(
  { workspaceId: 1, systemContext: 1 },
  { unique: true, partialFilterExpression: { isSystem: true, parentId: null } }
);
FolderSchema.index(
  { workspaceId: 1, sourceEntityId: 1, sourceEntityType: 1 },
  { sparse: true }
);

export const assertFolderIsDeletable = (folder: Pick<IFolder, "isSystem">) => {
  if (folder.isSystem) {
    throw new Error("System folders cannot be deleted.");
  }
};

export default mongoose.models.Folder ||
  mongoose.model<IFolder>("Folder", FolderSchema);
