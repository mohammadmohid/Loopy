import express from "express";
import { createMeeting, getJoinToken, getMyMeetings, endMeeting, getMeetingById, updateMeeting } from "../controllers/meetingController.js";
import { protect } from "@loopy/shared";
import { handleJaaSWebhook } from "../controllers/webhookController.js";

const router = express.Router();

router.post("/", protect, createMeeting);
router.get("/", protect, getMyMeetings);
router.get("/join/:roomName", protect, getJoinToken);
router.patch("/end/:roomName", protect, endMeeting);
router.post("/webhook", handleJaaSWebhook);
router.get("/:id", getMeetingById);
router.patch("/:id", protect, updateMeeting);
export default router;