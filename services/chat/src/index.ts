import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import chatRoutes from "./routes/chatRoutes.js";

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

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI as string)
    .then(() => console.log("ChatDB Connected"))
    .catch((err) => console.error("ChatDB Connection Error:", err));

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
