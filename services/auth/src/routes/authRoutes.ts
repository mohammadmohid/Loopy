import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  findUserById,
  updateProfile,
  getUsers,
} from "../controllers/authController.js";
import {
  verifyOTP,
  resendOTP,
  createWorkspace,
  inviteMember,
  acceptInvite,
  joinWorkspace,
  getMembers,
  getWorkspaceMembersById,
  updateMemberRole,
  switchWorkspace,
  getMyWorkspaces,
  leaveWorkspace,
  transferOwnership,
  deleteWorkspace,
  removeMember,
  resendInvite,
} from "../controllers/workspaceController.js";
import { signAvatarUpload } from "../controllers/uploadController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Auth
router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);

// OTP
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

// User Profile
router.get("/me", protect, getMe);
router.put("/me", protect, updateProfile);
router.post("/upload/avatar/sign", signAvatarUpload);
router.get("/users", protect, getUsers);
router.get("/:id", protect, findUserById);

// Workspaces
router.post("/workspaces", protect, createWorkspace);
router.get("/workspaces/members", protect, getMembers);
router.post("/workspaces/invite", protect, inviteMember);
router.post("/workspaces/accept-invite", acceptInvite);
router.post("/workspaces/join", protect, joinWorkspace);
router.patch("/workspaces/members/:memberId", protect, updateMemberRole);
router.get("/workspaces/:id/members", protect, getWorkspaceMembersById);
router.post("/workspaces/switch", protect, switchWorkspace);
router.get("/workspaces/me", protect, getMyWorkspaces);
router.post("/workspaces/:id/leave", protect, leaveWorkspace);
router.post("/workspaces/:id/transfer-ownership", protect, transferOwnership);
router.delete("/workspaces/:id", protect, deleteWorkspace);
router.delete("/workspaces/members/:memberId", protect, removeMember);
router.post("/workspaces/invites/resend", protect, resendInvite);

export default router;
