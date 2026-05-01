import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import transcriptionRoutes from "./routes/transcriptionRoutes.js";

const app = express();

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

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI is not defined. Exiting.");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("Transcription DB Connected"))
  .catch((err) => {
    console.error("DB Connection Error:", err);
    process.exit(1);
  });

const PORT = process.env.PORT;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Transcription Service running on port ${PORT}`));
}

export default app;
