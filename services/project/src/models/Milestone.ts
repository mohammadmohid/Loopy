import mongoose, { Schema, Document } from "mongoose";

export interface IMilestone extends Document {
  name: string;
  description?: string;
  startDate: Date;
  dueDate: Date;
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
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IMilestone>("Milestone", MilestoneSchema);
