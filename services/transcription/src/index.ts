import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config({
  path: path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env"),
});

import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import transcriptionRoutes from "./routes/transcriptionRoutes.js";

const app = express();

app.use(helmet());

const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean) ?? [];

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin: same-origin / server-to-server (gateway → service)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Local dev: empty allowlist would reject the Next app (e.g. http://localhost:3000)
      if (allowedOrigins.length === 0 && process.env.NODE_ENV !== "production") {
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

const rawPort =
  process.env.TRANSCRIPTION_PORT ?? process.env.PORT ?? "5005";
const PORT =
  Number(String(rawPort).replace(/^["']|["']$/g, "")) || 5005;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Transcription Service running on port ${PORT}`));
}

export default app;
