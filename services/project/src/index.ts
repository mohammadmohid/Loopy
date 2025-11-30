import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import { protect, authorize } from "./middleware/auth";
import {
  createProject,
  getProjects,
  assignTeamLead,
} from "./controllers/projectController";

dotenv.config();

const app = express();
const allowedOrigins = ["http://localhost:3000", "https://loopy-mu.vercel.app"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Database Connection
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("ProjectDB Connected"))
  .catch((err) => console.error(err));

const router = express.Router();

// Routes
// Only Admin and Project Manager can create projects
router.post("/", protect, authorize("ADMIN"), createProject);

// All authenticated users can view projects (filtered by controller logic)
router.get("/", protect, getProjects);

// Assign Team Lead
router.put("/:id/assign-lead", protect, authorize("ADMIN"), assignTeamLead);

app.use("/api/projects", router);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Project Service running on port ${PORT}`));
