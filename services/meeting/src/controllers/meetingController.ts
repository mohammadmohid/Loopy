import Meeting from "../models/Meeting.js";
import { generateJitsiToken } from "../utils/jitsiToken.js";
import { Request, Response } from "express";

// @route   POST /api/meetings/
export const createMeeting = async (req: Request, res: Response) => {
  try {
    const { projectId, title, participants, scheduledAt } = req.body;
    const hostId = req.user.id;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
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
    });

    // Format: Loopy-<ProjectID>-<MeetingID>
    meeting.roomName = `Loopy-${projectId}-${meeting._id}`;

    await meeting.save();
    res.status(201).json(meeting);

  } catch (error: any) {
    console.error("Create Meeting Error:", error);
    res.status(500).json({ message: error.message || "Failed to create meeting" });
  }
};

// @route   GET /api/meetings
export const getMyMeetings = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    // meeting == "active" && > 24h, mark as ended.
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    await Meeting.updateMany(
      { hostId: userId, status: "active", createdAt: { $lt: cutoffDate } },
      { $set: { status: "ended", endedAt: new Date() } }
    );

    const meetings = await Meeting.find({
      $or: [{ hostId: userId }, { participants: userId }],
    }).sort({ createdAt: -1 });

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

    res.json(meeting);
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
    const meeting = await Meeting.findById(id);

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
    const allowedUpdates = ["status", "title", "participants", "scheduledAt", "recordingUrl"];
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

    res.status(200).json(meeting);
  } catch (error) {
    console.error("Update Meeting Error:", error);
    res.status(500).json({ message: "Failed to update meeting" });
  }
};