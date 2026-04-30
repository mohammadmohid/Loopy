import mongoose, { Schema, Document } from "mongoose";

export interface IChannelMember {
    user: mongoose.Types.ObjectId;
    role: "admin" | "member";
    joinedAt: Date;
}

export interface IChannel extends Document {
    name: string;
    description?: string;
    type: "project" | "team" | "private" | "direct" | "global";
    projectId?: mongoose.Types.ObjectId;
    teamId?: mongoose.Types.ObjectId;
    workspaceId: mongoose.Types.ObjectId;
    members: IChannelMember[];
    createdBy?: mongoose.Types.ObjectId; // Make it optional for global channel auto-creation
    isArchived: boolean;
    restrictedChat?: boolean; // Restrict to admin/PMs
    lastMessageAt?: Date;
    lastMessagePreview?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ChannelSchema: Schema = new Schema(
    {
        name: { type: String, required: true, trim: true, maxlength: 100 },
        description: { type: String, trim: true, maxlength: 500 },
        type: {
            type: String,
            enum: ["project", "team", "private", "direct", "global"],
            required: true,
            default: "team",
        },
        projectId: { type: Schema.Types.ObjectId, ref: "Project" },
        teamId: { type: Schema.Types.ObjectId },
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
        members: [
            {
                user: { type: Schema.Types.ObjectId, ref: "User", required: true },
                role: {
                    type: String,
                    enum: ["admin", "member"],
                    default: "member",
                },
                joinedAt: { type: Date, default: Date.now },
            },
        ],
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        isArchived: { type: Boolean, default: false },
        restrictedChat: { type: Boolean, default: false },
        lastMessageAt: { type: Date },
        lastMessagePreview: { type: String, maxlength: 200 },
    },
    { timestamps: true }
);

// Indexes — only non-redundant compound indexes
ChannelSchema.index({ projectId: 1 });
ChannelSchema.index({ workspaceId: 1, type: 1 });
ChannelSchema.index({ workspaceId: 1, teamId: 1 });
ChannelSchema.index({ workspaceId: 1, type: 1, "members.user": 1 });
ChannelSchema.index({ lastMessageAt: -1 });

export default mongoose.models.Channel || mongoose.model<IChannel>("Channel", ChannelSchema);
