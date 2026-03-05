import mongoose, { Schema, Document } from "mongoose";

export interface IChannelMember {
    user: mongoose.Types.ObjectId;
    role: "admin" | "member";
    joinedAt: Date;
}

export interface IChannel extends Document {
    name: string;
    description?: string;
    type: "project" | "team" | "private" | "direct";
    projectId?: mongoose.Types.ObjectId;
    members: IChannelMember[];
    createdBy: mongoose.Types.ObjectId;
    isArchived: boolean;
    lastMessageAt?: Date;
    lastMessagePreview?: string;
    createdAt: Date;
    updatedAt: Date;
}

const ChannelSchema: Schema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        type: {
            type: String,
            enum: ["project", "team", "private", "direct"],
            required: true,
            default: "team",
        },
        projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
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
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        isArchived: { type: Boolean, default: false },
        lastMessageAt: { type: Date },
        lastMessagePreview: { type: String },
    },
    { timestamps: true }
);

// Indexes for fast queries
ChannelSchema.index({ "members.user": 1 });
ChannelSchema.index({ type: 1 });
ChannelSchema.index({ lastMessageAt: -1 });

export default mongoose.model<IChannel>("Channel", ChannelSchema);
