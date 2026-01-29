import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import transcriptionRoutes from "./routes/transcriptionRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/", transcriptionRoutes);

// Database
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Transcription DB Connected"))
  .catch((err) => console.error("❌ DB Error:", err));

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
  console.log(`🚀 Transcription Service running on port ${PORT}`);
});