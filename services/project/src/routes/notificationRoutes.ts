import express from "express";
import { protect } from "@loopy/shared";
import { internalNotificationSecret } from "../middleware/internalNotificationSecret.js";
import {
  streamNotifications,
  listNotifications,
  markNotificationRead,
  markAllRead,
  unreadCount,
  internalDispatch,
  internalMeetingPM,
} from "../controllers/notificationController.js";

const router = express.Router();

router.post(
  "/internal/dispatch",
  internalNotificationSecret,
  internalDispatch
);
router.post(
  "/internal/meeting-pm",
  internalNotificationSecret,
  internalMeetingPM
);

router.get("/stream", protect, streamNotifications);
router.get("/", protect, listNotifications);
router.get("/unread-count", protect, unreadCount);
router.patch("/:id/read", protect, markNotificationRead);
router.post("/read-all", protect, markAllRead);

export default router;
