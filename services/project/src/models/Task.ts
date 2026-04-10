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
    title: { type: String, required: true },
    description: { type: String },
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

export default mongoose.model<ITask>("Task", TaskSchema);
