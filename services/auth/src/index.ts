import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { connectDB } from "@loopy/shared";
import mongoose from "mongoose";
import authRoutes from "./routes/authRoutes.js";

const app = express();
app.set("trust proxy", 1);

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  try {
    await connectDB(undefined, mongoose);
    next();
  } catch (error) {
    console.error("Database connection failed", error);
    res.status(500).json({ message: "Database connection failed" });
  }
});


app.use(helmet());
app.use(cookieParser());

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") ?? [];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5001;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
}

export default app;

