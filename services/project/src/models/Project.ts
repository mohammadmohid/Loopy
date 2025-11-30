import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  members: { user: mongoose.Types.ObjectId; role: string }[];
  assignedTeams: { team: mongoose.Types.ObjectId; role: string }[];
  status: "active" | "completed" | "archived";
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Direct Member Assignment with Roles
    members: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        role: {
          type: String,
          enum: ["MANAGER", "EDITOR", "VIEWER"],
          default: "VIEWER",
        },
      },
    ],

    // Team Assignment (Inherited Permissions)
    assignedTeams: [
      {
        team: { type: Schema.Types.ObjectId, ref: "Team" },
        role: {
          type: String,
          enum: ["MANAGER", "EDITOR", "VIEWER"],
          default: "VIEWER",
        },
      },
    ],

    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
    },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IProject>("Project", ProjectSchema);
