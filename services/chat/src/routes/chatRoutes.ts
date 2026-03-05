import express from "express";
import { protect } from "../middleware/auth";
import {
    getUserChannels,
    getChannelById,
    createChannel,
    createProjectChannel,
    updateChannel,
    archiveChannel,
    addMembers,
    removeMember,
    getChannelMembers,
} from "../controllers/channelController";
import {
    getMessages,
    getThreadMessages,
    sendMessage,
    editMessage,
    deleteMessage,
    toggleReaction,
    searchMessages,
    signUpload,
} from "../controllers/messageController";

const router = express.Router();

// --- Search (must be before parameterized routes) ---
router.get("/search", protect, searchMessages);

// --- Upload ---
router.post("/upload/sign", protect, signUpload);

// --- Channel Routes ---
router.post("/channels/project-webhook", createProjectChannel);
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
