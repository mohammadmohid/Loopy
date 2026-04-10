import mongoose, { Schema, Document } from "mongoose";

export interface IMilestone extends Document {
  name: string;
  description?: string;
  status: "open" | "completed";
  startDate: Date;
  dueDate: Date;
  assignees: mongoose.Types.ObjectId[];
  assignedTeams?: mongoose.Types.ObjectId[];
  projectId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ["open", "completed"], default: "open" },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    assignedTeams: [{ type: Schema.Types.ObjectId, ref: "Team" }],
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IMilestone>("Milestone", MilestoneSchema);
