import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
  title: string;
  description?: string;
  status: string;
  type: "task" | "bug" | "feature" | "story";
  priority: "low" | "medium" | "high";
  projectId: mongoose.Types.ObjectId;
  milestoneId?: mongoose.Types.ObjectId;
  assignees?: mongoose.Types.ObjectId[];
  assignedTeams?: mongoose.Types.ObjectId[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 5000 },
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
    milestoneId: { type: Schema.Types.ObjectId, ref: "Milestone" },
    assignees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    assignedTeams: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    dueDate: { type: Date },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────

// Board column queries: tasks by project filtered by status
TaskSchema.index({ projectId: 1, status: 1 });

// Milestone detail: tasks belonging to a milestone
TaskSchema.index({ milestoneId: 1 }, { sparse: true });

export default mongoose.model<ITask>("Task", TaskSchema);
