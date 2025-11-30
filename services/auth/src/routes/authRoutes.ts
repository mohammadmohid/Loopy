import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  findUserById,
} from "../controllers/authController.js";
import { signAvatarUpload } from "../controllers/uploadController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);
router.get("/:id", protect, findUserById);
router.get("/me", protect, getMe);
router.post("/upload/avatar/sign", signAvatarUpload);

export default router;
