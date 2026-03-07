import express from "express";
import { startTranscription, getArtifact, generateSummary, updateArtifactSummary, askQuestion } from "../controllers/transcriptionController.js";

const router = express.Router();

router.post("/transcribe", startTranscription); // Trigger (Internal)
router.post("/summary", generateSummary);     // Manual Summary (Frontend)
router.put("/summary/:meetingId", updateArtifactSummary); // Update Summary (Frontend)
router.post("/ask/:meetingId", askQuestion); // Chat Bot (Frontend)
router.get("/:meetingId", getArtifact);         // Fetch (Frontend)


export default router;