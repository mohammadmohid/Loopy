import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  name: string;
  description?: string;
  workspaceId: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  members: { user: mongoose.Types.ObjectId; role: string }[];
  assignedTeams: { team: mongoose.Types.ObjectId; role: string }[];
  status: "active" | "completed" | "archived";
  startDate: Date;
  endDate?: Date;
  boardColumns: { id: string; label: string; color: string }[];
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
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
    boardColumns: {
      type: [{ id: String, label: String, color: String }],
      default: [
        { id: "todo", label: "To Do", color: "bg-neutral-200" },
        { id: "in-progress", label: "In Progress", color: "bg-blue-500" },
        { id: "done", label: "Done", color: "bg-emerald-500" },
      ],
    },
  },
  { timestamps: true }
);

export default mongoose.model<IProject>("Project", ProjectSchema);
