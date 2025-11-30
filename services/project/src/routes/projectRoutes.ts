import express from "express";
import { protect } from "../middleware/auth";
import { createProject, getProjects } from "../controllers/projectController";
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

// Global Artifacts (Meetings)
router.get("/artifacts", protect, getArtifacts); // Get all user's artifacts
router.post("/artifacts/sign", protect, signUpload); // Sign upload (projectId in body)
router.post("/artifacts", protect, createArtifact); // Create artifact (projectId in body)

// Project-scoped Artifacts (Keep for backward compatibility if needed, or deprecate)
router.post("/:id/artifacts/sign", protect, signUpload);
router.post("/:id/artifacts", protect, createArtifact);

// Webhooks
router.post("/webhooks/transcription", handleTranscriptionWebhook);

export default router;
