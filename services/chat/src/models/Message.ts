import mongoose, { Schema, Document } from "mongoose";

export interface IReaction {
    emoji: string;
    users: mongoose.Types.ObjectId[];
}

export interface IAttachment {
    name: string;
    key: string;
    size: number;
    mimeType: string;
    url?: string; // Populated at query time with presigned URL
}

export interface IMessage extends Document {
    channelId: mongoose.Types.ObjectId;
    sender: mongoose.Types.ObjectId;
    content: string;
    type: "text" | "system" | "file";
    threadParentId?: mongoose.Types.ObjectId;
    replyCount: number;
    mentions: mongoose.Types.ObjectId[];
    reactions: IReaction[];
    attachments: IAttachment[];
    isEdited: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
    {
        channelId: {
            type: Schema.Types.ObjectId,
            ref: "Channel",
            required: true,
            index: true,
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: { type: String, default: "" },
        type: {
            type: String,
            enum: ["text", "system", "file"],
            default: "text",
        },
        threadParentId: {
            type: Schema.Types.ObjectId,
            ref: "Message",
            index: true,
        },
        replyCount: { type: Number, default: 0 },
        mentions: [{ type: Schema.Types.ObjectId, ref: "User" }],
        reactions: [
            {
                emoji: { type: String, required: true },
                users: [{ type: Schema.Types.ObjectId, ref: "User" }],
            },
        ],
        attachments: [
            {
                name: { type: String, required: true },
                key: { type: String, required: true },
                size: { type: Number, required: true },
                mimeType: { type: String, required: true },
            },
        ],
        isEdited: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Compound index for paginated channel messages
MessageSchema.index({ channelId: 1, createdAt: -1 });

// Text index for search
MessageSchema.index({ content: "text" });

export default mongoose.model<IMessage>("Message", MessageSchema);
