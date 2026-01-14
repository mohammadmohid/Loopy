import { v4 as uuidv4 } from "uuid";

// @desc    Create a new meeting room
// @route   POST /api/meetings
export const createMeeting = async (req, res) => {
  try {
    const { projectId, title } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    // Generate a unique room name: "Loopy-{ProjectId}-{RandomUUID}"
    const roomName = `Loopy-${projectId}-${uuidv4()}`;

    // Note: If you want to save meeting logs to MongoDB, you would import mongoose here.
    // For now, we just generate the dynamic link.

    res.status(201).json({
      success: true,
      roomName: roomName,
      meetingUrl: `/meetings/live/${roomName}`,
      projectId,
      title: title || "Untitled Meeting"
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ message: "Server error generating meeting" });
  }
};