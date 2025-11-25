import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  owner: mongoose.Types.ObjectId;
  teamLead?: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  status: "active" | "completed" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    owner: { type: Schema.Types.ObjectId, required: true },
    teamLead: { type: Schema.Types.ObjectId },
    members: [{ type: Schema.Types.ObjectId }],
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IProject>("Project", ProjectSchema);
