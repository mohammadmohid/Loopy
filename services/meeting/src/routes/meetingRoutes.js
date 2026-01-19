import express from "express";
import { createMeeting, getJoinToken, getMyMeetings, endMeeting } from "../controllers/meetingcontroller.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, createMeeting);
router.get("/", protect, getMyMeetings);
router.get("/join/:roomName", protect, getJoinToken);
router.patch("/end/:roomName", protect, endMeeting);
export default router;