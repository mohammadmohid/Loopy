import { v4 as uuidv4 } from "uuid";
import Meeting from "../models/Meeting.js";
import { generateJitsiToken } from "../utils/jitsiToken.js";


export const createMeeting = async (req, res) => {
  try {
    // 1. Extract fields
    const { projectId, projectName, title, participants, hostName } = req.body;
    const hostId = req.user.id; // Assuming user is authenticated via middleware

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    // 2. Initialize the Meeting Instance (Do not save yet)
    // Mongoose automatically creates the '_id' here, which we need for the room name.
    const meeting = new Meeting({
      title: title || "Untitled Meeting",
      projectId,
      projectName: projectName || "Unknown Project", // Crucial for folder organization
      participants: participants || [],
      hostId,
      hostName: hostName || "Unknown Host",
      status: "active",
    });

    // 3. Generate the "Double ID" Room Name
    // Format: Loopy-<ProjectID>-<MeetingID>
    // This allows the Webhook to parse both IDs instantly.
    meeting.roomName = `Loopy-${projectId}-${meeting._id}`;

    // 4. Save to MongoDB
    await meeting.save();

    res.status(201).json(meeting);

  } catch (error) {
    console.error("Create Meeting Error:", error);
    res.status(500).json({ message: "Failed to create meeting" });
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
// Get a single meeting by ID
export const getMeetingById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if ID is a valid MongoDB ObjectId to prevent crashes
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

export const updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // e.g. { status: "ended" }

    // Find by ID and update whatever fields are sent in the body
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