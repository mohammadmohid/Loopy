import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "@loopy/shared";
import transcriptionRoutes from "./routes/transcriptionRoutes.js";

const app = express();

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection failed", error);
    res.status(500).json({ message: "Database connection failed" });
  }
});

app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") ?? [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/artifacts", transcriptionRoutes);



const PORT = process.env.PORT;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Transcription Service running on port ${PORT}`));
}

export default app;
