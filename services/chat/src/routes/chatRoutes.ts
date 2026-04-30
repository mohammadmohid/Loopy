import express from "express";
import { protect } from "@loopy/shared";
import {
    getUserChannels,
    getChannelById,
    createChannel,
    createProjectChannel,
    deleteProjectChannel,
    updateChannel,
    archiveChannel,
    addMembers,
    removeMember,
    getChannelMembers,
    syncTeamChannel,
    deleteTeamChannel,
    syncWorkspaceMember,
} from "../controllers/channelController.js";
import {
    getMessages,
    getThreadMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    searchMessages,
    signUpload,
} from "../controllers/messageController.js";
import {
    getUnread,
    markChannelRead,
} from "../controllers/unreadController.js";

const router = express.Router();

// --- Search (must be before parameterized routes) ---
router.get("/search", protect, searchMessages);

// --- Unread Counts ---
router.get("/unread", protect, getUnread);
router.post("/unread/read", protect, markChannelRead);

// --- Upload ---
router.post("/upload/sign", protect, signUpload);

// --- Channel Routes ---
router.post("/channels/project-webhook", createProjectChannel);
router.delete("/channels/project-webhook/:projectId", deleteProjectChannel);
router.post("/channels/team-webhook", syncTeamChannel);
router.delete("/channels/team-webhook/:teamId", deleteTeamChannel);
router.post("/channels/member-webhook", syncWorkspaceMember);
router.post("/channels", protect, createChannel);
router.get("/channels", protect, getUserChannels);
router.get("/channels/:id", protect, getChannelById);
router.patch("/channels/:id", protect, updateChannel);
router.delete("/channels/:id", protect, archiveChannel);

// --- Channel Members ---
router.post("/channels/:id/members", protect, addMembers);
router.delete("/channels/:id/members/:userId", protect, removeMember);
router.get("/channels/:id/members", protect, getChannelMembers);

// --- Message Routes ---
router.get("/channels/:channelId/messages", protect, getMessages);
router.post("/channels/:channelId/messages", protect, sendMessage);
router.patch("/messages/:id", protect, editMessage);
router.delete("/messages/:id", protect, deleteMessage);

// --- Threading & Reactions ---
router.get("/messages/:id/thread", protect, getThreadMessages);
router.post("/messages/:id/reactions", protect, toggleReaction);

export default router;
