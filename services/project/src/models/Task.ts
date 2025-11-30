import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
  title: string;
  description?: string;
  status: "todo" | "in-progress" | "done";
  type: "task" | "bug" | "feature" | "story";
  priority: "low" | "medium" | "high";
  projectId: mongoose.Types.ObjectId;
  milestoneId?: mongoose.Types.ObjectId;
  assignee?: mongoose.Types.ObjectId; // User ID
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
      enum: ["todo", "in-progress", "done"],
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
    assignee: { type: Schema.Types.ObjectId, ref: "User" },
    dueDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<ITask>("Task", TaskSchema);
