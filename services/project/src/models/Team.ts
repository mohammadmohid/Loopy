import mongoose, { Schema, Document } from "mongoose";

export interface ITeam extends Document {
  name: string;
  workspaceId: mongoose.Types.ObjectId;
  leader: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    workspaceId: { type: Schema.Types.ObjectId, required: true, index: true },
    leader: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────

// helpers.ts: Team.find({ members: userId })
TeamSchema.index({ members: 1 });

export default mongoose.model<ITeam>("Team", TeamSchema);
