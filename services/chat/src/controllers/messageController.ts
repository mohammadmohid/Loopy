import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth";
import Channel from "../models/Channel";
import Message from "../models/Message";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "../config/r2";
import { v4 as uuidv4 } from "uuid";
import "../models/User";

// @desc    Get paginated messages for a channel
// @route   GET /api/chat/channels/:channelId/messages
export const getMessages = async (req: AuthRequest, res: Response) => {
    try {
        const { channelId } = req.params;
        const { cursor, limit = "50" } = req.query;
        const parsedLimit = Math.min(parseInt(limit as string, 10) || 50, 100);

        // Verify membership
        const channel = await Channel.findById(channelId);
        if (!channel) {
            return res.status(404).json({ message: "Channel not found" });
        }

        const isMember = channel.members.some(
            (m) => m.user.toString() === req.user!.id
        );
        if (!isMember) {
            return res
                .status(403)
                .json({ message: "Not a member of this channel" });
        }

        // Build query: only top-level messages (not thread replies)
        const query: any = {
            channelId,
            threadParentId: { $exists: false },
        };

        // Cursor-based pagination: fetch messages older than cursor
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor as string) };
        }

        const messages = await Message.find(query)
            .populate("sender", "profile.firstName profile.lastName profile.avatarKey email")
            .populate("mentions", "profile.firstName profile.lastName")
            .sort({ createdAt: -1 })
            .limit(parsedLimit + 1) // Fetch one extra to determine hasMore
            .lean();

        const hasMore = messages.length > parsedLimit;
        const result = hasMore ? messages.slice(0, parsedLimit) : messages;

        // Reverse so messages are in chronological order for the client
        result.reverse();

        res.json({
            messages: result,
            hasMore,
            nextCursor: hasMore
                ? result[0]?.createdAt?.toISOString()
                : null,
        });
    } catch (error: any) {
        console.error("getMessages Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get thread replies for a parent message
// @route   GET /api/chat/messages/:id/thread
export const getThreadMessages = async (req: AuthRequest, res: Response) => {
    try {
        const parentId = req.params.id;

        // Verify parent message exists
        const parent = await Message.findById(parentId)
            .populate("sender", "profile.firstName profile.lastName profile.avatarKey email")
            .lean();

        if (!parent) {
            return res.status(404).json({ message: "Parent message not found" });
        }

        // Verify membership in the channel
        const channel = await Channel.findById(parent.channelId);
        if (!channel) {
            return res.status(404).json({ message: "Channel not found" });
        }

        const isMember = channel.members.some(
            (m) => m.user.toString() === req.user!.id
        );
        if (!isMember) {
            return res.status(403).json({ message: "Not a member of this channel" });
        }

        const replies = await Message.find({ threadParentId: parentId })
            .populate("sender", "profile.firstName profile.lastName profile.avatarKey email")
            .populate("mentions", "profile.firstName profile.lastName")
            .sort({ createdAt: 1 })
            .lean();

        res.json({ parent, replies });
    } catch (error: any) {
        console.error("getThreadMessages Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send a new message
// @route   POST /api/chat/channels/:channelId/messages
export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        const { channelId } = req.params;
        const { content, threadParentId, attachments, mentions } = req.body;

        if (!content && (!attachments || attachments.length === 0)) {
            return res
                .status(400)
                .json({ message: "Message content or attachment is required" });
        }

        // Verify membership
        const channel = await Channel.findById(channelId);
        if (!channel) {
            return res.status(404).json({ message: "Channel not found" });
        }

        const isMember = channel.members.some(
            (m) => m.user.toString() === req.user!.id
        );
        if (!isMember) {
            return res
                .status(403)
                .json({ message: "Not a member of this channel" });
        }

        // Parse @mentions from content if not explicitly provided
        let parsedMentions = mentions || [];
        if (!mentions && content) {
            // Extract @mentions — looking for user IDs wrapped in mention syntax
            const mentionRegex = /@\[([^\]]+)\]\(([a-f0-9]{24})\)/g;
            let match;
            while ((match = mentionRegex.exec(content)) !== null) {
                parsedMentions.push(match[2]);
            }
        }

        // Determine message type
        const msgType =
            attachments && attachments.length > 0 && !content ? "file" : "text";

        const message = await Message.create({
            channelId,
            sender: new mongoose.Types.ObjectId(req.user!.id),
            content: content || "",
            type: msgType,
            threadParentId: threadParentId
                ? new mongoose.Types.ObjectId(threadParentId)
                : undefined,
            mentions: parsedMentions.map(
                (id: string) => new mongoose.Types.ObjectId(id)
            ),
            attachments: attachments || [],
        });

        // If this is a thread reply, increment the parent's replyCount
        if (threadParentId) {
            await Message.findByIdAndUpdate(threadParentId, {
                $inc: { replyCount: 1 },
            });
        }

        // Update channel's last message info
        const preview =
            content?.substring(0, 100) || (attachments?.length ? "📎 Attachment" : "");
        await Channel.findByIdAndUpdate(channelId, {
            lastMessageAt: new Date(),
            lastMessagePreview: preview,
        });

        // Populate sender for the response & socket emit
        await message.populate(
            "sender",
            "profile.firstName profile.lastName profile.avatarKey email"
        );
        await message.populate("mentions", "profile.firstName profile.lastName");

        const messageObj = message.toObject();

        // Emit via Socket.IO
        const io = req.app.get("io");
        if (io) {
            if (threadParentId) {
                io.to(`channel:${channelId}`).emit("thread-reply", {
                    parentId: threadParentId,
                    message: messageObj,
                });
            } else {
                io.to(`channel:${channelId}`).emit("new-message", messageObj);
            }

            // Notify mentioned users specifically
            parsedMentions.forEach((userId: string) => {
                io.to(`user:${userId}`).emit("mention", {
                    channelId,
                    message: messageObj,
                });
            });
        }

        res.status(201).json(messageObj);
    } catch (error: any) {
        console.error("sendMessage Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Edit a message
// @route   PATCH /api/chat/messages/:id
export const editMessage = async (req: AuthRequest, res: Response) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        if (message.sender.toString() !== req.user!.id) {
            return res
                .status(403)
                .json({ message: "Only the sender can edit this message" });
        }

        if (message.isDeleted) {
            return res.status(400).json({ message: "Cannot edit a deleted message" });
        }

        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ message: "Content is required" });
        }

        message.content = content;
        message.isEdited = true;
        await message.save();

        await message.populate(
            "sender",
            "profile.firstName profile.lastName profile.avatarKey email"
        );

        const messageObj = message.toObject();

        const io = req.app.get("io");
        if (io) {
            io.to(`channel:${message.channelId}`).emit("message-edited", messageObj);
        }

        res.json(messageObj);
    } catch (error: any) {
        console.error("editMessage Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Soft-delete a message
// @route   DELETE /api/chat/messages/:id
export const deleteMessage = async (req: AuthRequest, res: Response) => {
    try {
        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        // Allow sender or channel admin to delete
        const isSender = message.sender.toString() === req.user!.id;

        if (!isSender) {
            const channel = await Channel.findById(message.channelId);
            const isChannelAdmin = channel?.members.some(
                (m) => m.user.toString() === req.user!.id && m.role === "admin"
            );
            if (!isChannelAdmin) {
                return res
                    .status(403)
                    .json({ message: "Not authorized to delete this message" });
            }
        }

        message.isDeleted = true;
        message.content = "This message was deleted";
        message.attachments = [];
        message.reactions = [];
        await message.save();

        const io = req.app.get("io");
        if (io) {
            io.to(`channel:${message.channelId}`).emit("message-deleted", {
                messageId: message._id,
                channelId: message.channelId,
            });
        }

        res.json({ message: "Message deleted" });
    } catch (error: any) {
        console.error("deleteMessage Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Toggle a reaction on a message
// @route   POST /api/chat/messages/:id/reactions
export const toggleReaction = async (req: AuthRequest, res: Response) => {
    try {
        const { emoji } = req.body;
        if (!emoji) {
            return res.status(400).json({ message: "Emoji is required" });
        }

        const message = await Message.findById(req.params.id);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        const userId = new mongoose.Types.ObjectId(req.user!.id);
        const existingReaction = message.reactions.find((r) => r.emoji === emoji);

        if (existingReaction) {
            const userIndex = existingReaction.users.findIndex(
                (u) => u.toString() === req.user!.id
            );

            if (userIndex > -1) {
                // Remove user's reaction
                existingReaction.users.splice(userIndex, 1);

                // If no users left, remove the reaction entirely
                if (existingReaction.users.length === 0) {
                    message.reactions = message.reactions.filter(
                        (r) => r.emoji !== emoji
                    );
                }
            } else {
                // Add user to existing reaction
                existingReaction.users.push(userId);
            }
        } else {
            // Create new reaction
            message.reactions.push({ emoji, users: [userId] });
        }

        await message.save();

        const io = req.app.get("io");
        if (io) {
            io.to(`channel:${message.channelId}`).emit("reaction-updated", {
                messageId: message._id,
                reactions: message.reactions,
            });
        }

        res.json({ reactions: message.reactions });
    } catch (error: any) {
        console.error("toggleReaction Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Search messages across user's channels
// @route   GET /api/chat/search
export const searchMessages = async (req: AuthRequest, res: Response) => {
    try {
        const { q, channelId, userId, startDate, endDate, limit = "20" } = req.query;
        const parsedLimit = Math.min(parseInt(limit as string, 10) || 20, 50);

        if (!q && !channelId) {
            return res
                .status(400)
                .json({ message: "Search query (q) or channelId is required" });
        }

        // Get all channels the user belongs to
        const userChannels = await Channel.find({
            "members.user": req.user!.id,
            isArchived: false,
        }).select("_id name type");

        const userChannelIds = userChannels.map((c) => c._id);

        // Build search query
        const searchQuery: any = {
            channelId: channelId
                ? new mongoose.Types.ObjectId(channelId as string)
                : { $in: userChannelIds },
            isDeleted: false,
        };

        // Full-text search
        if (q) {
            searchQuery.$text = { $search: q as string };
        }

        // Filter by sender
        if (userId) {
            searchQuery.sender = new mongoose.Types.ObjectId(userId as string);
        }

        // Date range filter
        if (startDate || endDate) {
            searchQuery.createdAt = {};
            if (startDate) searchQuery.createdAt.$gte = new Date(startDate as string);
            if (endDate) searchQuery.createdAt.$lte = new Date(endDate as string);
        }

        const messages = await Message.find(searchQuery)
            .populate("sender", "profile.firstName profile.lastName profile.avatarKey email")
            .populate("channelId", "name type")
            .sort({ createdAt: -1 })
            .limit(parsedLimit)
            .lean();

        res.json({
            results: messages,
            total: messages.length,
        });
    } catch (error: any) {
        console.error("searchMessages Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate presigned URL for file upload
// @route   POST /api/chat/upload/sign
export const signUpload = async (req: AuthRequest, res: Response) => {
    try {
        const { fileName, fileType, fileSize } = req.body;

        if (!fileName || !fileType) {
            return res
                .status(400)
                .json({ message: "fileName and fileType are required" });
        }

        // Max 50MB
        if (fileSize && fileSize > 50 * 1024 * 1024) {
            return res
                .status(400)
                .json({ message: "File size exceeds 50MB limit" });
        }

        const key = `chat-attachments/${uuidv4()}-${fileName}`;

        const r2 = getR2Client();
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 600 });

        res.json({ uploadUrl, key });
    } catch (error: any) {
        console.error("signUpload Error:", error);
        res.status(500).json({ message: error.message });
    }
};
