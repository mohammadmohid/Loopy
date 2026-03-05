import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth";
import Channel from "../models/Channel";
import Message from "../models/Message";
import "../models/User";

// @desc    Get all channels the authenticated user belongs to
// @route   GET /api/chat/channels
export const getUserChannels = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;

        const channels = await Channel.find({
            "members.user": userId,
            isArchived: false,
        })
            .populate(
                "members.user",
                "profile.firstName profile.lastName profile.avatarKey email"
            )
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .lean();

        res.json(channels);
    } catch (error: any) {
        console.error("getUserChannels Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get a single channel by ID
// @route   GET /api/chat/channels/:id
export const getChannelById = async (req: AuthRequest, res: Response) => {
    try {
        const channel = await Channel.findById(req.params.id)
            .populate(
                "members.user",
                "profile.firstName profile.lastName profile.avatarKey email"
            )
            .lean();

        if (!channel) {
            return res.status(404).json({ message: "Channel not found" });
        }

        // Verify membership
        const isMember = channel.members.some(
            (m: any) => m.user._id?.toString() === req.user!.id || m.user?.toString() === req.user!.id
        );
        if (!isMember) {
            return res.status(403).json({ message: "Not a member of this channel" });
        }

        res.json(channel);
    } catch (error: any) {
        console.error("getChannelById Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a new team/private/direct channel
// @route   POST /api/chat/channels
export const createChannel = async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, type, memberIds } = req.body;

        if (!name || !type) {
            return res.status(400).json({ message: "Name and type are required" });
        }

        if (type === "project") {
            return res
                .status(400)
                .json({ message: "Project channels are created automatically" });
        }

        // Build members array: creator is always admin
        const members: any[] = [
            {
                user: new mongoose.Types.ObjectId(req.user!.id),
                role: "admin",
                joinedAt: new Date(),
            },
        ];

        // Add additional members
        if (memberIds && Array.isArray(memberIds)) {
            memberIds.forEach((id: string) => {
                if (
                    mongoose.Types.ObjectId.isValid(id) &&
                    id !== req.user!.id
                ) {
                    members.push({
                        user: new mongoose.Types.ObjectId(id),
                        role: "member",
                        joinedAt: new Date(),
                    });
                }
            });
        }

        // For direct messages, enforce exactly 2 members
        if (type === "direct") {
            if (members.length !== 2) {
                return res
                    .status(400)
                    .json({ message: "Direct messages require exactly 2 members" });
            }

            // Check if a DM channel already exists between these two users
            const existingDM = await Channel.findOne({
                type: "direct",
                isArchived: false,
                "members.user": { $all: members.map((m) => m.user) },
                $expr: { $eq: [{ $size: "$members" }, 2] },
            });

            if (existingDM) {
                return res.json(existingDM);
            }
        }

        const channel = await Channel.create({
            name,
            description,
            type,
            members,
            createdBy: new mongoose.Types.ObjectId(req.user!.id),
        });

        // Populate members for the response
        await channel.populate(
            "members.user",
            "profile.firstName profile.lastName profile.avatarKey email"
        );

        // Emit socket event for all members
        const io = req.app.get("io");
        if (io) {
            members.forEach((m) => {
                io.to(`user:${m.user.toString()}`).emit("channel-created", channel);
            });
        }

        res.status(201).json(channel);
    } catch (error: any) {
        console.error("createChannel Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a project channel (webhook from project service)
// @route   POST /api/chat/channels/project-webhook
export const createProjectChannel = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const { projectId, projectName, members: memberIds, createdBy } = req.body;

        if (!projectId || !projectName || !createdBy) {
            return res
                .status(400)
                .json({ message: "projectId, projectName, and createdBy are required" });
        }

        // Check if a channel already exists for this project
        const existing = await Channel.findOne({ projectId, type: "project" });
        if (existing) {
            return res.json(existing);
        }

        // Build members — creator is channel admin
        const channelMembers = (memberIds || []).map((id: string) => ({
            user: new mongoose.Types.ObjectId(id),
            role: id === createdBy ? "admin" : "member",
            joinedAt: new Date(),
        }));

        // Ensure creator is in the list
        if (!channelMembers.find((m: any) => m.user.toString() === createdBy)) {
            channelMembers.unshift({
                user: new mongoose.Types.ObjectId(createdBy),
                role: "admin",
                joinedAt: new Date(),
            });
        }

        const channel = await Channel.create({
            name: projectName,
            description: `Project channel for ${projectName}`,
            type: "project",
            projectId: new mongoose.Types.ObjectId(projectId),
            members: channelMembers,
            createdBy: new mongoose.Types.ObjectId(createdBy),
        });

        // Create a system message
        await Message.create({
            channelId: channel._id,
            sender: new mongoose.Types.ObjectId(createdBy),
            content: `Channel created for project "${projectName}"`,
            type: "system",
        });

        // Notify connected users
        const io = req.app.get("io");
        if (io) {
            channelMembers.forEach((m: any) => {
                io.to(`user:${m.user.toString()}`).emit("channel-created", channel);
            });
        }

        res.status(201).json(channel);
    } catch (error: any) {
        console.error("createProjectChannel Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update channel name/description
// @route   PATCH /api/chat/channels/:id
export const updateChannel = async (req: AuthRequest, res: Response) => {
    try {
        const channel = await Channel.findById(req.params.id);
        if (!channel) {
            return res.status(404).json({ message: "Channel not found" });
        }

        // Only channel admins can update
        const memberEntry = channel.members.find(
            (m) => m.user.toString() === req.user!.id
        );
        if (!memberEntry || memberEntry.role !== "admin") {
            return res
                .status(403)
                .json({ message: "Only channel admins can update this channel" });
        }

        if (req.body.name) channel.name = req.body.name;
        if (req.body.description !== undefined)
            channel.description = req.body.description;

        await channel.save();
        await channel.populate(
            "members.user",
            "profile.firstName profile.lastName profile.avatarKey email"
        );

        // Notify all channel members
        const io = req.app.get("io");
        if (io) {
            io.to(`channel:${channel._id}`).emit("channel-updated", channel);
        }

        res.json(channel);
    } catch (error: any) {
        console.error("updateChannel Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Archive a channel (soft delete)
// @route   DELETE /api/chat/channels/:id
export const archiveChannel = async (req: AuthRequest, res: Response) => {
    try {
        const channel = await Channel.findById(req.params.id);
        if (!channel) {
            return res.status(404).json({ message: "Channel not found" });
        }

        const memberEntry = channel.members.find(
            (m) => m.user.toString() === req.user!.id
        );
        if (!memberEntry || memberEntry.role !== "admin") {
            return res
                .status(403)
                .json({ message: "Only channel admins can archive this channel" });
        }

        // Don't allow archiving project channels (they live with the project)
        if (channel.type === "project") {
            return res
                .status(400)
                .json({ message: "Project channels cannot be archived directly" });
        }

        channel.isArchived = true;
        await channel.save();

        const io = req.app.get("io");
        if (io) {
            io.to(`channel:${channel._id}`).emit("channel-archived", {
                channelId: channel._id,
            });
        }

        res.json({ message: "Channel archived" });
    } catch (error: any) {
        console.error("archiveChannel Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add members to a channel
// @route   POST /api/chat/channels/:id/members
export const addMembers = async (req: AuthRequest, res: Response) => {
    try {
        const channel = await Channel.findById(req.params.id);
        if (!channel) {
            return res.status(404).json({ message: "Channel not found" });
        }

        // Only admins can add members
        const memberEntry = channel.members.find(
            (m) => m.user.toString() === req.user!.id
        );
        if (!memberEntry || memberEntry.role !== "admin") {
            return res
                .status(403)
                .json({ message: "Only channel admins can add members" });
        }

        const { memberIds } = req.body;
        if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
            return res.status(400).json({ message: "memberIds array is required" });
        }

        const newMembers: any[] = [];

        memberIds.forEach((id: string) => {
            if (!mongoose.Types.ObjectId.isValid(id)) return;

            const exists = channel.members.find(
                (m) => m.user.toString() === id
            );
            if (!exists) {
                const newMember = {
                    user: new mongoose.Types.ObjectId(id),
                    role: "member" as const,
                    joinedAt: new Date(),
                };
                channel.members.push(newMember);
                newMembers.push(newMember);
            }
        });

        if (newMembers.length === 0) {
            return res.status(400).json({ message: "All users are already members" });
        }

        await channel.save();
        await channel.populate(
            "members.user",
            "profile.firstName profile.lastName profile.avatarKey email"
        );

        // Create system messages and notify
        const io = req.app.get("io");
        for (const nm of newMembers) {
            await Message.create({
                channelId: channel._id,
                sender: new mongoose.Types.ObjectId(req.user!.id),
                content: `added a new member to the channel`,
                type: "system",
            });

            if (io) {
                io.to(`user:${nm.user.toString()}`).emit("channel-created", channel);
                io.to(`channel:${channel._id}`).emit("member-joined", {
                    channelId: channel._id,
                    userId: nm.user.toString(),
                });
            }
        }

        res.json(channel);
    } catch (error: any) {
        console.error("addMembers Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove a member from a channel (or leave)
// @route   DELETE /api/chat/channels/:id/members/:userId
export const removeMember = async (req: AuthRequest, res: Response) => {
    try {
        const channel = await Channel.findById(req.params.id);
        if (!channel) {
            return res.status(404).json({ message: "Channel not found" });
        }

        const targetUserId = req.params.userId;
        const isSelf = targetUserId === req.user!.id;

        // If not self-removing, must be admin
        if (!isSelf) {
            const memberEntry = channel.members.find(
                (m) => m.user.toString() === req.user!.id
            );
            if (!memberEntry || memberEntry.role !== "admin") {
                return res
                    .status(403)
                    .json({ message: "Only channel admins can remove members" });
            }
        }

        // Can't remove from project channels (tied to project membership)
        if (channel.type === "project") {
            return res
                .status(400)
                .json({ message: "Cannot remove members from project channels directly" });
        }

        const memberIndex = channel.members.findIndex(
            (m) => m.user.toString() === targetUserId
        );

        if (memberIndex === -1) {
            return res.status(404).json({ message: "User is not a member of this channel" });
        }

        channel.members.splice(memberIndex, 1);
        await channel.save();

        // System message
        await Message.create({
            channelId: channel._id,
            sender: new mongoose.Types.ObjectId(req.user!.id),
            content: isSelf ? "left the channel" : "removed a member from the channel",
            type: "system",
        });

        const io = req.app.get("io");
        if (io) {
            io.to(`channel:${channel._id}`).emit("member-left", {
                channelId: channel._id.toString(),
                userId: targetUserId,
            });
            io.to(`user:${targetUserId}`).emit("channel-removed", {
                channelId: channel._id.toString(),
            });
        }

        res.json({ message: "Member removed" });
    } catch (error: any) {
        console.error("removeMember Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get channel members
// @route   GET /api/chat/channels/:id/members
export const getChannelMembers = async (req: AuthRequest, res: Response) => {
    try {
        const channel = await Channel.findById(req.params.id)
            .populate(
                "members.user",
                "profile.firstName profile.lastName profile.avatarKey email"
            )
            .lean();

        if (!channel) {
            return res.status(404).json({ message: "Channel not found" });
        }

        // Verify membership
        const isMember = channel.members.some(
            (m: any) => m.user._id?.toString() === req.user!.id || m.user?.toString() === req.user!.id
        );
        if (!isMember) {
            return res.status(403).json({ message: "Not a member of this channel" });
        }

        res.json(channel.members);
    } catch (error: any) {
        console.error("getChannelMembers Error:", error);
        res.status(500).json({ message: error.message });
    }
};
