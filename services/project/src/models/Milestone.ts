import mongoose, { Schema, Document } from "mongoose";

export interface IMilestone extends Document {
  name: string;
  description?: string;
  status: "open" | "completed";
  startDate: Date;
  dueDate: Date;
  duration?: string;
  goal?: string;
  tasks: mongoose.Types.ObjectId[];
  projectId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 2000 },
    status: { type: String, enum: ["open", "completed"], default: "open" },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    duration: { type: String, maxlength: 50 },
    goal: { type: String, maxlength: 1000 },
    tasks: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────

// Primary query: milestones by project
MilestoneSchema.index({ projectId: 1 });

export default mongoose.model<IMilestone>("Milestone", MilestoneSchema);
