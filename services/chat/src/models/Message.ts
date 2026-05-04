import mongoose, { Schema, Document } from "mongoose";

export interface IReaction {
    emoji: string;
    users: mongoose.Types.ObjectId[];
}

export interface IAttachment {
    fileId?: mongoose.Types.ObjectId; // Reference to file service
    name?: string;
    key?: string;
    size?: number;
    mimeType?: string;
    url?: string; // Populated at query time with presigned URL
    isInline?: boolean; // For image attachments displayed inline
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
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: { type: String, default: "", maxlength: 10000 },
        type: {
            type: String,
            enum: ["text", "system", "file"],
            default: "text",
        },
        threadParentId: {
            type: Schema.Types.ObjectId,
            ref: "Message",
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
                fileId: { type: Schema.Types.ObjectId, ref: "File", sparse: true },
                name: { type: String, maxlength: 255 },
                key: { type: String, select: false },
                size: { type: Number },
                mimeType: { type: String, maxlength: 127 },
                isInline: { type: Boolean, default: false },
            },
        ],
        isEdited: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// Compound index for paginated channel messages
MessageSchema.index({ channelId: 1, createdAt: -1 });

// Compound index for paginated thread replies
MessageSchema.index({ threadParentId: 1, createdAt: -1 }, { sparse: true });

// Text index for search
MessageSchema.index({ content: "text" });

export default mongoose.model<IMessage>("Message", MessageSchema);
