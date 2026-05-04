import express, { Express } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import { connectMongoWithRetry } from "@loopy/shared";
import fileRoutes from "./routes/files.js";
import { allowInternalServiceCalls } from "./middleware/internalServiceAuth.js";

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5006;

// Middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// Allow internal service calls before authentication
app.use(allowInternalServiceCalls);

// Routes
app.use("/api/files", fileRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "file-service" });
});

// MongoDB connection (same path as other services: DNS tweaks + IPv4 + retries for Atlas SRV)
const connectDB = async () => {
  try {
    await connectMongoWithRetry(process.env.MONGO_URI || undefined, { label: "File" });
    console.log("✅ MongoDB connected to File Service");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};

// Start server
const start = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 File Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start File Service:", error);
    process.exit(1);
  }
};

start();

export default app;

