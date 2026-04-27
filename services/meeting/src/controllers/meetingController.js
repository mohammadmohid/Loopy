import { v4 as uuidv4 } from "uuid";
import Meeting from "../models/Meeting.js";
import { generateJitsiToken } from "../utils/jitsiToken.js";
import {
  triggerTranscriptionPipeline,
  scheduleTranscriptionCatchUp,
} from "../utils/triggerTranscription.js";
import {
  projectIdsForWorkspace,
  meetingBelongsToActiveWorkspace,
  workspaceScopedMeetingQuery,
} from "../utils/meetingWorkspaceScope.js";

export const createMeeting = async (req, res) => {
  try {
    // 1. Extract fields
    const { projectId, projectName, title, agenda, participants, hostName, scheduledAt } = req.body;
    const hostId = req.user.id; // Assuming user is authenticated via middleware
    const workspaceId = req.user.workspaceId;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }
    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace selected" });
    }

    const allowedProjectIds = await projectIdsForWorkspace(String(workspaceId));
    if (!allowedProjectIds.includes(String(projectId))) {
      return res.status(403).json({
        message: "That project is not in your active workspace. Switch workspace or pick a different project.",
      });
    }

    // 2. Initialize the Meeting Instance (Do not save yet)
    // Mongoose automatically creates the '_id' here, which we need for the room name.
    const meeting = new Meeting({
      title: title || "Untitled Meeting",
      agenda: agenda || "",
      projectId,
      projectName: projectName || "Unknown Project", // Crucial for folder organization
      participants: participants || [],
      hostId,
      hostName: hostName || "Unknown Host",
      status: scheduledAt ? "scheduled" : "active",
      workspaceId: String(workspaceId),
      ...(scheduledAt && { scheduledAt }),
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
    const workspaceId = req.user.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace selected" });
    }

    // --- 1. AUTO-CLEANUP (non-blocking) ---
    // Avoid awaiting a large updateMany before every list request (can slow or stall the gateway proxy).
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    void Meeting.updateMany(
      { status: "active", createdAt: { $lt: cutoffDate } },
      { $set: { status: "ended", endedAt: new Date() } }
    ).catch((err) => console.error("[MeetingService] Stale active cleanup failed:", err));

    // --- 2. FETCH MEETINGS (scoped to active workspace — matches project service behavior) ---
    console.log(`[MeetingService] Fetching meetings for user=${userId} workspace=${workspaceId}`);
    const query = await workspaceScopedMeetingQuery(userId, String(workspaceId));
    const meetings = await Meeting.find(query).sort({ createdAt: -1 });

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
    const workspaceId = req.user.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace selected" });
    }

    const existing = await Meeting.findOne({ roomName });
    if (!existing) return res.status(404).json({ message: "Meeting not found" });
    const allowed = await meetingBelongsToActiveWorkspace(existing, String(workspaceId));
    if (!allowed) {
      return res.status(403).json({ message: "This meeting is not in your active workspace" });
    }

    const meeting = await Meeting.findOneAndUpdate(
      { roomName },
      { status: "ended", endedAt: new Date() },
      { new: true }
    );

    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    if (meeting.projectId && meeting.recordingUrl) {
      triggerTranscriptionPipeline(
        {
          meetingId: meeting._id,
          projectId: meeting.projectId,
          recordingUrl: meeting.recordingUrl,
          filename: meeting.title || "Meeting",
        },
        "end-by-room"
      );
    } else if (meeting.projectId) {
      scheduleTranscriptionCatchUp(meeting._id, "end-by-room-no-recording-yet");
    }

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

    const workspaceId = req.user.workspaceId;
    if (workspaceId) {
      const m = await Meeting.findOne({ roomName }).lean();
      if (m) {
        const allowed = await meetingBelongsToActiveWorkspace(m, String(workspaceId));
        if (!allowed) {
          return res.status(403).json({ message: "This meeting is not in your active workspace" });
        }
      }
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
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace selected" });
    }

    // Validate if ID is a valid MongoDB ObjectId to prevent crashes
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid Meeting ID format" });
    }

    const meeting = await Meeting.findById(id);

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found in DB" });
    }

    const allowed = await meetingBelongsToActiveWorkspace(meeting, String(workspaceId));
    if (!allowed) {
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
    const workspaceId = req.user.workspaceId;
    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace selected" });
    }

    const existing = await Meeting.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "Meeting not found" });
    }
    const allowed = await meetingBelongsToActiveWorkspace(existing, String(workspaceId));
    if (!allowed) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const meeting = await Meeting.findByIdAndUpdate(id, updates, { new: true });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    // After meeting ends (and recording exists), or when a recording URL is set, run pipeline.
    // Avoid unrelated PATCHes (e.g. title-only).
    const ended = updates.status === "ended";
    const recordingUpdated = Object.prototype.hasOwnProperty.call(updates, "recordingUrl");
    const shouldTrigger =
      meeting.projectId &&
      ((ended && meeting.recordingUrl) || (recordingUpdated && updates.recordingUrl));

    if (shouldTrigger) {
      triggerTranscriptionPipeline(
        {
          meetingId: meeting._id,
          projectId: meeting.projectId,
          recordingUrl: meeting.recordingUrl,
          filename: meeting.title || "Meeting",
        },
        "update-meeting"
      );
    }

    // Meeting often ends before recordingUrl exists; webhook should trigger transcription, but if
    // that POST failed or ordering was wrong, retry once a recording URL appears on this doc.
    if (updates.status === "ended" && !meeting.recordingUrl && meeting.projectId) {
      scheduleTranscriptionCatchUp(meeting._id, "patch-ended-no-recording-yet");
    }

    res.status(200).json(meeting);
  } catch (error) {
    console.error("Update Meeting Error:", error);
    res.status(500).json({ message: "Failed to update meeting" });
  }
};