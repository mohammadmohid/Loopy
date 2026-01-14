import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import meetingRoutes from "./routes/meetingRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8003; // Running on port 8003

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/meetings", meetingRoutes);

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "Meeting Service is active" });
});

app.listen(PORT, () => {
  console.log(`Meeting Service (JS) running on port ${PORT}`);
});