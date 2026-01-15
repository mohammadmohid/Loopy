import express from "express";
import { createMeeting, getJoinToken, getMyMeetings } from "../controllers/meetingcontroller.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, createMeeting);
router.get("/", protect, getMyMeetings);
router.get("/join/:roomName", protect, getJoinToken);
export default router;