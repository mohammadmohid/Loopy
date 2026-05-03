import mongoose, { Document, Schema } from "mongoose";

export type NotificationCategory = "task" | "meeting" | "update";

export interface INotification extends Document {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  category: NotificationCategory;
  kind: string;
  title: string;
  body: string;
  read: boolean;
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ["task", "meeting", "update"],
      required: true,
    },
    kind: { type: String, required: true, maxlength: 120 },
    title: { type: String, required: true, maxlength: 220 },
    body: { type: String, required: true, maxlength: 4000 },
    read: { type: Boolean, default: false },
    dedupeKey: { type: String, maxlength: 320 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, dedupeKey: 1 }, { unique: true, sparse: true });

export default mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
