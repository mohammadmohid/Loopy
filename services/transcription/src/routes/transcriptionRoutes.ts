import express from "express";
import {
  startTranscription,
  getArtifact,
  triggerSummary,
  updateSummary,
  askBot,
} from "../controllers/transcriptionController.js";

const router = express.Router();

// All routes are mounted under /api/artifacts in index.ts
router.post("/transcribe", startTranscription);     // Internal: trigger transcription
router.post("/summary", triggerSummary);             // Frontend: request AI summary
router.put("/summary/:meetingId", updateSummary);    // Frontend: manual edit
router.post("/ask/:meetingId", askBot);              // Frontend: chat bot
router.get("/:meetingId", getArtifact);              // Frontend: fetch artifact

export default router;
