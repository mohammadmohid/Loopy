import "./env.js";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { connectMongoWithRetry } from "@loopy/shared";
import cookieParser from "cookie-parser";
import chatRoutes from "./routes/chatRoutes.js";
import { getRedisClient } from "./config/redis.js";
import { getChatListenPort } from "./chatPort.js";

const app = express();

const allowedOrigins =
    process.env.ALLOWED_ORIGINS?.split(",")
        .map((o) => o.trim())
        .filter(Boolean) ?? [];

app.use(
    cors({
        origin(origin, callback) {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            if (allowedOrigins.length === 0 && process.env.NODE_ENV !== "production") {
                return callback(null, true);
            }
            return callback(null, false);
        },
        credentials: true,
    })
);

app.use(cookieParser());
app.use(express.json());

app.use("/api/chat", chatRoutes);

app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "chat" });
});

async function connectDB() {
    await connectMongoWithRetry(process.env.MONGO_URI, { label: "Chat" });
    console.log(`ChatDB Connected (${mongoose.connection.host})`);
}

async function start() {
    await connectDB();

    const redisClient = getRedisClient();
    if (redisClient) console.log("Redis ready (Upstash REST)");
    else console.warn("Redis unavailable — running without cache");

    if (process.env.NODE_ENV !== "production") {
        const port = getChatListenPort();
        app.listen(port, () =>
            console.log(`Chat Service running on port ${port} (set CHAT_PORT to override; generic PORT is ignored for listen)`)
        );
    }
}

void start().catch((err) => {
    console.error("Chat service failed to start:", err);
    process.exit(1);
});

export default app;
