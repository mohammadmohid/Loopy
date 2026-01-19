import { v4 as uuidv4 } from "uuid";
import Meeting from "../models/Meeting.js";
import { generateJitsiToken } from "../utils/jitsiToken.js";

// @desc    Create a new meeting room
// @route   POST /api/meetings
export const createMeeting = async (req, res) => {
  try {
    // 1. Extract fields (Added projectName back)
    const { projectId, projectName, title, participants, hostName } = req.body;
    const hostId = req.user.id;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    // 2. Generate a unique room name
    const roomName = `Loopy-${projectId}-${uuidv4()}`;

    // 3. Save to MongoDB
    const meeting = await Meeting.create({
      roomName,
      title: title || "Untitled Meeting",
      projectId,
      projectName: projectName || "Unknown Project", // Ensure this is saved
      participants: participants || [],
      hostId,
      hostName: hostName || "Unknown Host",
      status: "active",
    });

    // 4. Return the saved data
    res.status(201).json({
      success: true,
      roomName: meeting.roomName,
      meetingUrl: `/meetings/live/${meeting.roomName}`,
      meetingId: meeting._id,
      projectId: meeting.projectId,
      title: meeting.title,
      participants: meeting.participants,
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ message: "Server error generating meeting" });
  }
};

// @desc    Get meetings for the current user (Host or Participant)
// @route   GET /api/meetings
export const getMyMeetings = async (req, res) => {
  try {
    const userId = req.user.id;

    // --- 1. AUTO-CLEANUP LOGIC (Run this FIRST) ---
    // If a meeting is still "active" but created more than 24 hours ago, mark it as ended.
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); 
    
    await Meeting.updateMany(
      { status: "active", createdAt: { $lt: cutoffDate } },
      { $set: { status: "ended", endedAt: new Date() } }
    );

    // --- 2. FETCH MEETINGS (Run this ONCE) ---
    // Now fetch the updated list (Active + Ended)
    const meetings = await Meeting.find({
      $or: [{ hostId: userId }, { participants: userId }],
    }).sort({ createdAt: -1 });

    res.json(meetings);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ message: "Server error fetching meetings" });
  }
};

// @desc    Mark meeting as ended
// @route   PATCH /api/meetings/end/:roomName
export const endMeeting = async (req, res) => {
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

// @desc    Get Jitsi JWT for joining a room
// @route   GET /api/meetings/join/:roomName
export const getJoinToken = async (req, res) => {
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