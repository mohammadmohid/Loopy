import { Response } from "express";
import { AuthRequest } from "@loopy/shared";
import { getUnreadCounts, clearUnread } from "../services/unreadService";

/**
 * @desc    Get all unread counts for the authenticated user
 * @route   GET /api/chat/unread
 */
export const getUnread = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const counts = await getUnreadCounts(userId);
        res.json({ counts });
    } catch (error: any) {
        console.error("getUnread Error:", error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Mark a channel as read for the authenticated user
 * @route   POST /api/chat/unread/read
 */
export const markChannelRead = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { channelId } = req.body;

        if (!channelId) {
            return res.status(400).json({ message: "channelId is required" });
        }

        await clearUnread(userId, channelId);
        res.json({ message: "Channel marked as read" });
    } catch (error: any) {
        console.error("markChannelRead Error:", error);
        res.status(500).json({ message: error.message });
    }
};
