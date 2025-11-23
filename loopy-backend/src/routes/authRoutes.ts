import express from "express";
import { register, login, logout } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout); // Protected because we need the token to blacklist it

export default router;
