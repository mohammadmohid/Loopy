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
import { signAvatarUpload } from "../controllers/uploadController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);

router.get("/me", protect, getMe);
router.put("/me", protect, updateProfile);
router.post("/upload/avatar/sign", signAvatarUpload);
router.get("/users", protect, getUsers);

router.get("/:id", protect, findUserById);

export default router;
