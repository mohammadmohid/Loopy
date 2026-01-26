import express from "express";
import { startTranscription, getArtifact, generateSummary} from "../controllers/transcriptionController.js";

const router = express.Router();

router.post("/transcribe", startTranscription); // Trigger (Internal)
router.post("/summary", generateSummary);     // Manual Summary (Frontend)
router.get("/:meetingId", getArtifact);         // Fetch (Frontend)


export default router;