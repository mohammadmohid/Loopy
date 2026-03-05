import express from "express";
import { authorize, protect } from "../middleware/auth";
import {
  createProject,
  getProjects,
  assignTeamLead,
  deleteProject,
  updateProject,
  getProjectActivity,
} from "../controllers/projectController";
import {
  signUpload,
  createArtifact,
  handleTranscriptionWebhook,
  getArtifacts,
  getArtifactById,
} from "../controllers/artifactController";
import {
  getProjectTasks,
  createTask,
  updateTask,
  deleteTask,
  getProjectMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "../controllers/taskController";

const router = express.Router();

// Projects
router.post("/", protect, authorize("ADMIN", "PROJECT_MANAGER"), createProject);
router.patch("/:id", protect, authorize("ADMIN", "PROJECT_MANAGER"), updateProject);
router.get("/", protect, getProjects);
router.delete("/:id", protect, authorize("ADMIN", "PROJECT_MANAGER"), deleteProject);
router.put("/:id/assign-lead", protect, authorize("ADMIN", "PROJECT_MANAGER"), assignTeamLead);

// Project Activity
router.get("/:projectId/activity", protect, getProjectActivity);

// Tasks & Milestones
router.get("/:projectId/tasks", protect, getProjectTasks);
router.post("/:projectId/tasks", protect, createTask);
router.patch("/tasks/:id", protect, updateTask);
router.delete("/tasks/:id", protect, deleteTask);

router.get("/:projectId/milestones", protect, getProjectMilestones);
router.post("/:projectId/milestones", protect, createMilestone);
router.patch("/milestones/:id", protect, updateMilestone);
router.delete("/milestones/:id", protect, deleteMilestone);

// Global Artifacts
router.get("/artifacts", protect, getArtifacts);
router.get("/artifacts/:id", protect, getArtifactById);
router.post("/artifacts/sign", protect, signUpload);
router.post("/artifacts", protect, createArtifact);

// Webhooks
router.post("/webhooks/transcription", handleTranscriptionWebhook);

export default router;
