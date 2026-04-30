import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "@loopy/shared";
import cookieParser from "cookie-parser";
import projectRoutes from "./routes/projectRoutes.js";

dotenv.config();

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

// Get allowed origins from env
const allowedOrigins = (process.env.ALLOWED_ORIGINS as string) && (process.env.ALLOWED_ORIGINS as string).split(",");
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

app.use("/api/projects", projectRoutes);


const PORT = process.env.PORT || 5002;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Project Service running on port ${PORT}`));
}

export default app;
