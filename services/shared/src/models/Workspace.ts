import mongoose, { Document, Schema } from "mongoose";

export interface IWorkspaceMember {
    user: mongoose.Types.ObjectId;
    role: "ADMIN" | "PROJECT_MANAGER" | "MEMBER";
    joinedAt: Date;
}

export interface IInviteToken {
    token: string;
    email: string;
    role: "PROJECT_MANAGER" | "MEMBER";
    expiresAt: Date;
    used: boolean;
}

export interface IWorkspace extends Document {
    name: string;
    owner: mongoose.Types.ObjectId;
    members: IWorkspaceMember[];
    inviteTokens: IInviteToken[];
    createdAt: Date;
    updatedAt: Date;
}

const WorkspaceSchema = new Schema<IWorkspace>(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
        members: [
            {
                user: { type: Schema.Types.ObjectId, ref: "User", required: true },
                role: {
                    type: String,
                    enum: ["ADMIN", "PROJECT_MANAGER", "MEMBER"],
                    default: "MEMBER",
                },
                joinedAt: { type: Date, default: Date.now },
            },
        ],
        inviteTokens: [
            {
                token: { type: String, required: true },
                email: { type: String, required: true, lowercase: true, trim: true },
                role: {
                    type: String,
                    enum: ["PROJECT_MANAGER", "MEMBER"],
                    default: "MEMBER",
                },
                expiresAt: { type: Date, required: true },
                used: { type: Boolean, default: false },
            },
        ],
    },
    { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────
WorkspaceSchema.index({ "members.user": 1 });
WorkspaceSchema.index({ "inviteTokens.token": 1 }, { sparse: true });

// ── Auto-cleanup expired/used invite tokens on read ───────────────────
WorkspaceSchema.pre("findOne", function () {
  this.updateOne(
    {},
    {
      $pull: {
        inviteTokens: {
          $or: [
            { expiresAt: { $lt: new Date() } },
            { used: true },
          ],
        },
      },
    }
  );
});

export default mongoose.models.Workspace || mongoose.model<IWorkspace>("Workspace", WorkspaceSchema);
