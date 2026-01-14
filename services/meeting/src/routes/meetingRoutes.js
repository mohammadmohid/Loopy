import express from "express";
import { createMeeting } from "../controllers/meetingcontroller.js";

const router = express.Router();

router.post("/", createMeeting);

export default router;