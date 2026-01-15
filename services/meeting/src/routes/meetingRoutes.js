import express from "express";
import { createMeeting, getJoinToken } from "../controllers/meetingcontroller.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, createMeeting);
router.get("/join/:roomName", protect, getJoinToken);
export default router;