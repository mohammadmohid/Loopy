import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "@loopy/shared";
import mongoose from "mongoose";
import chatRoutes from "./routes/chatRoutes.js";
import { getRedisClient } from "./config/redis.js";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

const allowedOrigins = [
    "http://localhost:3000",
    "https://loopy-mu.vercel.app",
    "http://192.168.7.15:3000",
];

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



// Initialise Upstash Redis client (HTTP-based, no persistent connection)
const redisClient = getRedisClient();
if (redisClient) console.log("Redis ready (Upstash REST)");
else console.warn("Redis unavailable — running without cache");


// Mount routes
app.use("/api/chat", chatRoutes);

// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "chat" });
});

if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 5005;
    app.listen(PORT, () =>
        console.log(`Chat Service running on port ${PORT}`)
    );
}

export default app;
