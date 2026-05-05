import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
  title: string;
  description?: string;
  status: string;
  type: "task" | "bug" | "feature" | "story";
  priority: "low" | "medium" | "high";
  projectId: mongoose.Types.ObjectId;
  assignees?: mongoose.Types.ObjectId[];
  assignedTeams?: mongoose.Types.ObjectId[];
  dueDate?: Date;
  attachments?: mongoose.Types.ObjectId[]; // File IDs
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 5000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      default: "todo",
    },
    type: {
      type: String,
      enum: ["task", "bug", "feature", "story"],
      default: "task",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    assignedTeams: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    dueDate: { type: Date },
    attachments: [{ type: Schema.Types.ObjectId, ref: "File" }],
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────

// Board column queries: tasks by project filtered by status
TaskSchema.index({ projectId: 1, status: 1 });

export default mongoose.model<ITask>("Task", TaskSchema);
