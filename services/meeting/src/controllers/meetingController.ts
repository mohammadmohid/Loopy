import Meeting from "../models/Meeting.js";
import { generateJitsiToken } from "../utils/jitsiToken.js";
import { Request, Response } from "express";
import { User } from "@loopy/shared";
import { getProjectIdsInWorkspace, isProjectInWorkspace } from "../utils/workspaceProjects.js";

void User;

const HOST_POPULATE = {
  path: "hostId" as const,
  select: "profile.firstName profile.lastName email",
};

// @route   POST /api/meetings/
export const createMeeting = async (req: Request, res: Response) => {
  try {
    const { projectId, title, participants, scheduledAt, agenda } = req.body;
    const hostId = req.user.id;
    const workspaceId = req.user.workspaceId as string | undefined;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace" });
    }

    const projectAllowed = await isProjectInWorkspace(String(projectId), workspaceId);
    if (!projectAllowed) {
      return res.status(403).json({
        message: "Project not found in this workspace",
      });
    }

    if (participants && !Array.isArray(participants)) {
      return res.status(400).json({ message: "Participants must be an array" });
    }

    const meeting = new Meeting({
      title: title || "Untitled Meeting",
      projectId,
      participants: participants || [],
      hostId,
      status: scheduledAt ? "scheduled" : "active",
      ...(scheduledAt && { scheduledAt }),
      ...(typeof agenda === "string" && agenda.trim() ? { agenda: agenda.trim() } : {}),
    });

    // Format: Loopy-<ProjectID>-<MeetingID>
    meeting.roomName = `Loopy-${projectId}-${meeting._id}`;

    await meeting.save();
    const created = await Meeting.findById(meeting._id).populate(HOST_POPULATE).lean();
    res.status(201).json(created ?? meeting);

  } catch (error: any) {
    console.error("Create Meeting Error:", error);
    res.status(500).json({ message: error.message || "Failed to create meeting" });
  }
};

// @route   GET /api/meetings
export const getMyMeetings = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const workspaceId = req.user.workspaceId as string | undefined;

    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace" });
    }

    const projectIds = await getProjectIdsInWorkspace(workspaceId);

    // meeting == "active" && > 24h, mark as ended — only within this workspace's projects.
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    if (projectIds.length > 0) {
      await Meeting.updateMany(
        {
          hostId: userId,
          status: "active",
          createdAt: { $lt: cutoffDate },
          projectId: { $in: projectIds },
        },
        { $set: { status: "ended", endedAt: new Date() } }
      );
    }

    const meetings = await Meeting.find({
      $or: [{ hostId: userId }, { participants: userId }],
      projectId: { $in: projectIds },
    })
      .populate(HOST_POPULATE)
      .sort({ createdAt: -1 })
      .lean();

    res.json(meetings);
  } catch (error: any) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ message: error.message || "Server error fetching meetings" });
  }
};

// @route   PATCH /api/meetings/end/:roomName
export const endMeeting = async (req: Request, res: Response) => {
  try {
    const { roomName } = req.params;

    const meeting = await Meeting.findOneAndUpdate(
      { roomName },
      { status: "ended", endedAt: new Date() },
      { new: true }
    );

    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    const ended = await Meeting.findById(meeting._id).populate(HOST_POPULATE).lean();

    console.log(
      `[Meeting] Ended room=${roomName}. R2 + transcript run only after JaaS sends RECORDING_UPLOADED to POST /api/meetings/webhook (public HTTPS URL — not localhost unless tunneled).`
    );

    res.json(ended ?? meeting);
  } catch (error) {
    console.error("Error ending meeting:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// @route   GET /api/meetings/join/:roomName
export const getJoinToken = async (req: Request, res: Response) => {
  try {
    const { roomName } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const token = generateJitsiToken(req.user, roomName);

    res.json({ token, roomName });
  } catch (error) {
    console.error("Token Gen Error:", error);
    res.status(500).json({ message: "Failed to generate token" });
  }
};

// @route   GET /api/meetings/:id
export const getMeetingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid Meeting ID format" });
    }
    const meeting = await Meeting.findById(id).populate(HOST_POPULATE).lean();

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found in DB" });
    }

    res.status(200).json(meeting);
  } catch (error) {
    console.error("Get Meeting Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const updateMeeting = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const allowedUpdates = ["status", "title", "participants", "scheduledAt", "recordingUrl", "agenda"];
    const updates: any = {};
    
    for (const key of Object.keys(req.body)) {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided for update" });
    }

    const meeting = await Meeting.findByIdAndUpdate(id, updates, { new: true });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const updated = await Meeting.findById(meeting._id).populate(HOST_POPULATE).lean();
    res.status(200).json(updated ?? meeting);
  } catch (error) {
    console.error("Update Meeting Error:", error);
    res.status(500).json({ message: "Failed to update meeting" });
  }
};