import express from "express";
import { protect } from "../middleware/auth";
import {
  createProject,
  getProjects,
  assignTeamLead,
  deleteProject,
} from "../controllers/projectController";
import {
  signUpload,
  createArtifact,
  handleTranscriptionWebhook,
  getArtifacts,
} from "../controllers/artifactController";

const router = express.Router();

// Projects
router.post("/", protect, createProject);
router.get("/", protect, getProjects);
router.delete("/:id", protect, deleteProject);
router.put("/:id/assign-lead", protect, assignTeamLead);

// Global Artifacts (Meetings)
router.get("/artifacts", protect, getArtifacts);
router.post("/artifacts/sign", protect, signUpload);
router.post("/artifacts", protect, createArtifact);

// Project-scoped Artifacts
router.post("/:id/artifacts/sign", protect, signUpload);
router.post("/:id/artifacts", protect, createArtifact);

// Webhooks
router.post("/webhooks/transcription", handleTranscriptionWebhook);

export default router;
