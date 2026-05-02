import "./env.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { connectMongoWithRetry } from "@loopy/shared";
import cookieParser from "cookie-parser";
import projectRoutes from "./routes/projectRoutes";

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") ?? [];

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

void connectMongoWithRetry(process.env.MONGO_URI, { label: "Project" })
  .then(() => console.log(`ProjectDB Connected (${mongoose.connection.host})`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

app.use("/api/projects", projectRoutes);

const PORT = process.env.PORT || 5002;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Project Service running on port ${PORT}`));
}

export default app;
