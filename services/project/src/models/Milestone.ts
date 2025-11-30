import mongoose, { Schema, Document } from "mongoose";

export interface IMilestone extends Document {
  name: string;
  description?: string;
  startDate: Date;
  dueDate: Date;
  assignees: mongoose.Types.ObjectId[];
  projectId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    assignees: [{ type: Schema.Types.ObjectId, ref: "User" }],
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IMilestone>("Milestone", MilestoneSchema);
