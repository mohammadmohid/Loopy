import express from "express";
import { authorize, protect } from "@loopy/shared";
import {
  createProject,
  getProjects,
  assignTeamLead,
  deleteProject,
  updateProject,
  getProjectActivity,
  deleteWorkspaceProjects,
  getProjectById,
  generateScreenRecordingUploadUrl
} from "../controllers/projectController.js";
import { getDashboard } from "../controllers/dashboardController.js";
import {
  signUpload,
  createArtifact,
  getArtifacts,
  getArtifactById,
  getRecentArtifacts,
} from "../controllers/artifactController.js";
import {
  getFolders,
  getSystemFolders,
  createFolder,
  deleteFolder,
} from "../controllers/folderController.js";
import {
  getProjectTasks,
  createTask,
  updateTask,
  deleteTask,
  attachFileToTask,
  detachFileFromTask,
  getTaskAttachments,
  getProjectMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from "../controllers/taskController.js";
import {
  createTeam,
  getTeams,
  updateTeam,
  deleteTeam,
} from "../controllers/teamController.js";

const router = express.Router();

router.post("/", protect, authorize("ADMIN", "PROJECT_MANAGER"), createProject);
router.get("/", protect, getProjects);
router.get("/dashboard", protect, getDashboard);
router.post("/upload/screen-recording", protect, generateScreenRecordingUploadUrl);

// Project Activity
router.get("/:projectId/activity", protect, getProjectActivity);

// Tasks & Milestones
router.get("/:projectId/tasks", protect, getProjectTasks);
router.post("/:projectId/tasks", protect, createTask);
router.patch("/tasks/:id", protect, updateTask);
router.delete("/tasks/:id", protect, deleteTask);
router.post("/tasks/:id/attachments", protect, attachFileToTask);
router.delete("/tasks/:id/attachments", protect, detachFileFromTask);
router.get("/tasks/:id/attachments", protect, getTaskAttachments);

router.get("/:projectId/milestones", protect, getProjectMilestones);
router.post("/:projectId/milestones", protect, createMilestone);
router.patch("/milestones/:id", protect, updateMilestone);
router.delete("/milestones/:id", protect, deleteMilestone);

// Global Artifacts
router.get("/artifacts", protect, getArtifacts);
router.get("/artifacts/recent", protect, getRecentArtifacts);
router.get("/artifacts/:id", protect, getArtifactById);
router.post("/artifacts/sign", protect, signUpload);
router.post("/artifacts", protect, createArtifact);

// Folders
router.get("/folders", protect, getFolders);
router.get("/folders/system", protect, getSystemFolders);
router.post("/folders", protect, createFolder);
router.delete("/folders/:id", protect, deleteFolder);

// Teams
router.post("/teams", protect, authorize("ADMIN", "PROJECT_MANAGER"), createTeam);
router.get("/teams", protect, getTeams);
router.patch("/teams/:id", protect, updateTeam);
router.delete("/teams/:id", protect, deleteTeam);

// Inter-service Webhooks
router.delete("/workspace-webhook/:workspaceId", deleteWorkspaceProjects); // Inter-service auth could be via API Key, skipping `protect` for simpilcity to trust internal network

// ID-based Project Routes (Must be at the bottom to prevent swallowing /teams, /artifacts etc)
router.get("/:id", protect, getProjectById);
router.patch("/:id", protect, updateProject);
router.delete("/:id", protect, authorize("ADMIN", "PROJECT_MANAGER"), deleteProject);
router.put("/:id/assign-lead", protect, authorize("ADMIN", "PROJECT_MANAGER"), assignTeamLead);

export default router;
