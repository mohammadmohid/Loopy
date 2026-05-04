import express from "express";
import { protect } from "@loopy/shared";
import {
  startTranscription,
  getArtifact,
  triggerSummary,
  updateSummary,
  askBot,
} from "../controllers/transcriptionController.js";
import {
  approveActionProposal,
  patchActionProposal,
  rejectActionProposal,
} from "../controllers/actionProposalController.js";

const router = express.Router();

// Webhook / internal: no JWT (meeting service POSTs here).
router.post("/transcribe", startTranscription);

router.post("/summary", protect, triggerSummary);
router.put("/summary/:meetingId", protect, updateSummary);
router.post("/ask/:meetingId", protect, askBot);

router.post(
  "/:meetingId/action-proposals/:proposalId/approve",
  protect,
  approveActionProposal
);
router.post(
  "/:meetingId/action-proposals/:proposalId/reject",
  protect,
  rejectActionProposal
);
router.patch(
  "/:meetingId/action-proposals/:proposalId",
  protect,
  patchActionProposal
);

router.get("/:meetingId", protect, getArtifact);

export default router;
