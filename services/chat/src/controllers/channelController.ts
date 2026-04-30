import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest, Channel } from "@loopy/shared";
import Message from "../models/Message.js";
import "@loopy/shared"; // Load User model
import { createAvatarResolver, populateChannelAvatars } from "../utils/avatar.js";
import { pusher } from "../config/pusher.js";
import { clearUnread } from "../services/unreadService.js";

// @desc    Get all channels the authenticated user belongs to (scoped to workspace)
// @route   GET /api/chat/channels
export const getUserChannels = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const workspaceId = req.user!.workspaceId;

        if (!workspaceId) {
            return res.status(400).json({ message: "No active workspace" });
        }

        // Auto-create global "Everyone" channel for this workspace if it doesn't exist
        let globalChannel = await Channel.findOne({
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            type: "global",
            isArchived: false,
        });

        if (!globalChannel) {
            globalChannel = await Channel.create({
                name: "Everyone",
                description: "A channel for everyone in this workspace",
                type: "global",
                workspaceId: new mongoose.Types.ObjectId(workspaceId),
                members: [],
                isArchived: false,
            });
        }

        const channels = await Channel.find({
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            $or: [
                { "members.user": userId },
                { type: "global" }
            ],
            isArchived: false,
        })
            .populate(
                "members.user",
                "profile.firstName profile.lastName profile.avatarKey email"
            )
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .lean();

        const resolveAvatar = createAvatarResolver();
        for (const channel of channels) {
            await populateChannelAvatars(channel, resolveAvatar);
        }

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

        // Verify membership (global channels are open to everyone)
        const isMember = (channel as any).type === "global" || (channel as any).members.some(
            (m: any) => m.user._id?.toString() === req.user!.id || m.user?.toString() === req.user!.id
        );
        if (!isMember) {
            return res.status(403).json({ message: "Not a member of this channel" });
        }

        const resolveAvatar = createAvatarResolver();
        await populateChannelAvatars(channel as any, resolveAvatar);

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

        // Restrict channel creation (except DMs) to Admins and PMs
        if (type !== "direct" && req.user!.role !== "ADMIN" && req.user!.role !== "MANAGER") {
            return res.status(403).json({ message: "Only admins and project managers can create channels" });
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
                "members.user": { $all: members.map((m: any) => m.user) },
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
            workspaceId: new mongoose.Types.ObjectId(req.user!.workspaceId!),
            createdBy: new mongoose.Types.ObjectId(req.user!.id),
            restrictedChat: req.body.restrictedChat || false,
        });

        // Populate members for the response
        await channel.populate(
            "members.user",
            "profile.firstName profile.lastName profile.avatarKey email"
        );

        // Emit Pusher event for all members
        members.forEach((m: any) => {
            pusher.trigger(`user-${m.user.toString()}`, "channel-created", channel);
        });

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
        const { projectId, projectName, members: memberIds, createdBy, workspaceId } = req.body;

        if (!projectId || !projectName || !createdBy || !workspaceId) {
            return res
                .status(400)
                .json({ message: "projectId, projectName, createdBy, and workspaceId are required" });
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
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
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

        // Notify connected users via Pusher
        channelMembers.forEach((m: any) => {
            pusher.trigger(`user-${m.user.toString()}`, "channel-created", channel);
        });

        res.status(201).json(channel);
    } catch (error: any) {
        console.error("createProjectChannel Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a project channel and ALL it's messages (webhook from project service)
// @route   DELETE /api/chat/channels/project-webhook/:projectId
export const deleteProjectChannel = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ message: "projectId is required" });
        }

        const projectChannels = await Channel.find({ projectId, type: "project" });
        if (!projectChannels.length) {
            return res.status(200).json({ message: "No channels to delete" });
        }

        const channelIds = projectChannels.map(c => c._id);

        // Delete all messages within those channels
        await Message.deleteMany({ channelId: { $in: channelIds } });

        // Delete the actual channels
        await Channel.deleteMany({ _id: { $in: channelIds } });

        // Optionally, emit a Pusher deletion event here if needed
        channelIds.forEach(id => {
            pusher.trigger(`channel-${id}`, "channel-deleted", {
                channelId: id.toString()
            });

            // Clear unread counts for all members (hygiene)
            const channel = projectChannels.find(c => c._id.toString() === id.toString());
            if (channel && channel.members) {
                channel.members.forEach((m: any) => {
                    clearUnread(m.user.toString(), id.toString()).catch(() => {});
                });
            }
        });

        res.status(200).json({ message: "Project channels and messages deleted" });
    } catch (error: any) {
        console.error("deleteProjectChannel Error:", error);
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
            (m: any) => m.user.toString() === req.user!.id
        );
        if (!memberEntry || memberEntry.role !== "admin") {
            return res
                .status(403)
                .json({ message: "Only channel admins can update this channel" });
        }

        // Direct and team channels cannot be updated explicitly by users
        if (channel.type === "direct" || channel.type === "team") {
            return res
                .status(403)
                .json({ message: "Direct and team channels cannot be edited directly" });
        }

        if (req.body.name) channel.name = req.body.name;
        if (req.body.description !== undefined)
            channel.description = req.body.description;
        if (req.body.restrictedChat !== undefined)
            channel.restrictedChat = req.body.restrictedChat;

        await channel.save();
        await channel.populate(
            "members.user",
            "profile.firstName profile.lastName profile.avatarKey email"
        );

        // Notify all channel members via Pusher
        pusher.trigger(`channel-${channel._id}`, "channel-updated", channel);

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
            (m: any) => m.user.toString() === req.user!.id
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

        // Don't allow archiving global channels
        if (channel.type === "global") {
            return res
                .status(400)
                .json({ message: "The Everyone channel cannot be deleted" });
        }

        // Don't allow archiving team channels (they live with the team)
        if (channel.type === "team") {
            return res
                .status(400)
                .json({ message: "Team channels cannot be archived directly" });
        }

        channel.isArchived = true;
        await channel.save();

        pusher.trigger(`channel-${channel._id}`, "channel-archived", {
            channelId: channel._id,
        });

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
            (m: any) => m.user.toString() === req.user!.id
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
                (m: any) => m.user.toString() === id
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

        // Create system messages and notify via Pusher
        for (const nm of newMembers) {
            await Message.create({
                channelId: channel._id,
                sender: new mongoose.Types.ObjectId(req.user!.id),
                content: `added a new member to the channel`,
                type: "system",
            });

            pusher.trigger(`user-${nm.user.toString()}`, "channel-created", channel);
            pusher.trigger(`channel-${channel._id}`, "member-joined", {
                channelId: channel._id,
                userId: nm.user.toString(),
            });
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
                (m: any) => m.user.toString() === req.user!.id
            );
            if (!memberEntry || memberEntry.role !== "admin") {
                return res
                    .status(403)
                    .json({ message: "Only channel admins can remove members" });
            }
        }

        // Can't remove from project, team, or direct channels (tied to external membership)
        if (channel.type === "project" || channel.type === "team" || channel.type === "direct") {
            return res
                .status(400)
                .json({ message: "Cannot leave or remove members from project, team, or direct channels directly" });
        }

        const memberIndex = channel.members.findIndex(
            (m: any) => m.user.toString() === targetUserId
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

        pusher.trigger(`channel-${channel._id}`, "member-left", {
            channelId: channel._id.toString(),
            userId: targetUserId,
        });
        pusher.trigger(`user-${targetUserId}`, "channel-removed", {
            channelId: channel._id.toString(),
        });

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
        const isMember = (channel as any).members.some(
            (m: any) => m.user._id?.toString() === req.user!.id || m.user?.toString() === req.user!.id
        );
        if (!isMember) {
            return res.status(403).json({ message: "Not a member of this channel" });
        }

        const resolveAvatar = createAvatarResolver();
        await populateChannelAvatars(channel as any, resolveAvatar);

        res.json((channel as any).members);
    } catch (error: any) {
        console.error("getChannelMembers Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// ── Webhook Endpoints (called by other services) ──────────────────────

// @desc    Create or sync a team channel (webhook from project service)
// @route   POST /api/chat/channels/team-webhook
export const syncTeamChannel = async (req: AuthRequest, res: Response) => {
    try {
        const { teamId, teamName, members: memberIds, leaderId, workspaceId } = req.body;

        if (!teamId || !teamName || !workspaceId) {
            return res.status(400).json({ message: "teamId, teamName, and workspaceId are required" });
        }

        // Check if a channel already exists for this team
        let channel = await Channel.findOne({
            teamId: new mongoose.Types.ObjectId(teamId),
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            type: "team",
        });

        const channelMembers = (memberIds || []).map((id: string) => ({
            user: new mongoose.Types.ObjectId(id),
            role: id === leaderId ? "admin" : "member",
            joinedAt: new Date(),
        }));

        if (channel) {
            // Update existing: sync members and name
            channel.name = teamName;
            channel.members = channelMembers;
            await channel.save();
        } else {
            // Create new team channel
            channel = await Channel.create({
                name: teamName,
                description: `Team channel for ${teamName}`,
                type: "team",
                teamId: new mongoose.Types.ObjectId(teamId),
                workspaceId: new mongoose.Types.ObjectId(workspaceId),
                members: channelMembers,
            });
        }

        // Notify connected users via Pusher
        channelMembers.forEach((m: any) => {
            pusher.trigger(`user-${m.user.toString()}`, "channel-created", channel);
        });

        res.status(200).json(channel);
    } catch (error: any) {
        console.error("syncTeamChannel Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a team channel (webhook from project service)
// @route   DELETE /api/chat/channels/team-webhook/:teamId
export const deleteTeamChannel = async (req: AuthRequest, res: Response) => {
    try {
        const { teamId } = req.params;

        const teamChannels = await Channel.find({ teamId, type: "team" });
        if (!teamChannels.length) {
            return res.status(200).json({ message: "No team channels to delete" });
        }

        const channelIds = teamChannels.map(c => c._id);

        // Delete all messages within those channels
        await Message.deleteMany({ channelId: { $in: channelIds } });

        // Delete the actual channels
        await Channel.deleteMany({ _id: { $in: channelIds } });

        channelIds.forEach(id => {
            pusher.trigger(`channel-${id}`, "channel-deleted", {
                channelId: id.toString()
            });

            // Clear unread counts for all members (hygiene)
            const channel = teamChannels.find(c => c._id.toString() === id.toString());
            if (channel && channel.members) {
                channel.members.forEach((m: any) => {
                    clearUnread(m.user.toString(), id.toString()).catch(() => {});
                });
            }
        });

        res.status(200).json({ message: "Team channels and messages deleted" });
    } catch (error: any) {
        console.error("deleteTeamChannel Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add a new workspace member to the global channel (webhook from auth service)
// @route   POST /api/chat/channels/member-webhook
export const syncWorkspaceMember = async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, userId } = req.body;

        if (!workspaceId || !userId) {
            return res.status(400).json({ message: "workspaceId and userId are required" });
        }

        // Find the global channel
        const globalChannel = await Channel.findOne({
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            type: "global",
            isArchived: false,
        });

        if (!globalChannel) {
            // Channel will be auto-created on first getUserChannels call
            return res.status(200).json({ message: "Global channel not yet created, will auto-create" });
        }

        // Add user if not already a member
        const alreadyMember = globalChannel.members.some(
            (m: any) => m.user.toString() === userId
        );

        if (!alreadyMember) {
            globalChannel.members.push({
                user: new mongoose.Types.ObjectId(userId),
                role: "member",
                joinedAt: new Date(),
            });
            await globalChannel.save();
        }

        res.status(200).json({ message: "Member synced to global channel" });
    } catch (error: any) {
        console.error("syncWorkspaceMember Error:", error);
        res.status(500).json({ message: error.message });
    }
};
