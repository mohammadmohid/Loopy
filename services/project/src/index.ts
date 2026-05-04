import "./env.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { connectMongoWithRetry } from "@loopy/shared";
import cookieParser from "cookie-parser";
import projectRoutes from "./routes/projectRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { startNotificationReminderJobs } from "./jobs/notificationReminders.js";

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        console.error(`[CORS] Origin ${origin} not allowed. Allowed: ${allowedOrigins.join(", ")}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

void connectMongoWithRetry(process.env.MONGO_URI, { label: "Project" })
  .then(() => {
    console.log(`ProjectDB Connected (${mongoose.connection.host})`);
    startNotificationReminderJobs();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

app.use("/api/notifications", notificationRoutes);
app.use("/api/projects", projectRoutes);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Project Service running on port ${PORT}`));

export default app;
