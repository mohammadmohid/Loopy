import { v4 as uuidv4 } from "uuid";
import Meeting from "../models/Meeting.js"; // Import the Mongoose Model
import { generateJitsiToken } from "../utils/jitsiToken.js";

// @desc    Create a new meeting room
// @route   POST /api/meetings
export const createMeeting = async (req, res) => {
  try {
    // 1. Extract participants along with other fields
    const { projectId, title, participants } = req.body;

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
      participants: participants || [], // Defaults to empty array if not provided
      status: "active",
    });

    // 4. Return the saved data
    res.status(201).json({
      success: true,
      roomName: meeting.roomName,
      meetingUrl: `/meetings/live/${meeting.roomName}`,
      projectId: meeting.projectId,
      title: meeting.title,
      participants: meeting.participants,
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ message: "Server error generating meeting" });
  }
};

// @desc    Get Jitsi JWT for joining a room
// @route   GET /api/meetings/join/:roomName
export const getJoinToken = async (req, res) => {
  try {
    const { roomName } = req.params;
    
    // req.user comes from the protect middleware
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