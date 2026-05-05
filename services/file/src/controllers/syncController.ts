import { Request, Response } from "express";
import {
  syncProjectFolders,
  removeProjectFolder,
  syncChatChannelFolder,
  removeChatChannelFolder,
  syncMeetingChannelFolder,
} from "../services/systemFolderService.js";

/**
 * Internal webhook: project service notifies file service of project lifecycle events.
 * POST /api/files/sync/project
 * Body: { action, projectId, projectName, workspaceId }
 */
export const syncProject = async (req: Request, res: Response) => {
  try {
    const { action, projectId, projectName, workspaceId } = req.body;

    if (!action || !projectId || !workspaceId) {
      res.status(400).json({ message: "Missing required fields: action, projectId, workspaceId" });
      return;
    }

    switch (action) {
      case "created":
      case "updated":
        await syncProjectFolders(workspaceId, projectId, projectName);
        break;
      case "deleted":
        await removeProjectFolder(workspaceId, projectId);
        break;
      default:
        res.status(400).json({ message: `Unknown action: ${action}` });
        return;
    }

    res.json({ message: `Project ${action} synced successfully` });
  } catch (error: any) {
    console.error("syncProject error:", error);
    res.status(500).json({ message: "Sync failed", error: error.message });
  }
};

/**
 * Internal webhook: chat service notifies file service of channel lifecycle events.
 * POST /api/files/sync/channel
 * Body: { action, channelId, channelName, channelType, workspaceId }
 */
export const syncChannel = async (req: Request, res: Response) => {
  try {
    const { action, channelId, channelName, channelType, workspaceId } = req.body;

    if (!action || !channelId || !workspaceId) {
      res.status(400).json({ message: "Missing required fields: action, channelId, workspaceId" });
      return;
    }

    switch (action) {
      case "created":
      case "updated":
        // Chat channels (project, team, private, direct) go under Chat/
        await syncChatChannelFolder(workspaceId, channelId, channelName, channelType);
        break;
      case "archived":
      case "deleted":
        await removeChatChannelFolder(workspaceId, channelId);
        break;
      default:
        res.status(400).json({ message: `Unknown action: ${action}` });
        return;
    }

    res.json({ message: `Channel ${action} synced successfully` });
  } catch (error: any) {
    console.error("syncChannel error:", error);
    res.status(500).json({ message: "Sync failed", error: error.message });
  }
};

/**
 * Internal webhook: meeting service notifies file service of meeting channel events.
 * POST /api/files/sync/meeting-channel
 * Body: { action, channelId, channelName, workspaceId }
 */
export const syncMeetingChannel = async (req: Request, res: Response) => {
  try {
    const { action, channelId, channelName, workspaceId } = req.body;

    if (!action || !channelId || !workspaceId) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    switch (action) {
      case "created":
      case "updated":
        await syncMeetingChannelFolder(workspaceId, channelId, channelName);
        break;
      default:
        break;
    }

    res.json({ message: `Meeting channel ${action} synced successfully` });
  } catch (error: any) {
    console.error("syncMeetingChannel error:", error);
    res.status(500).json({ message: "Sync failed", error: error.message });
  }
};
