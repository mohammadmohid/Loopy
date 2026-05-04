import "./env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import meetingRoutes from "./routes/meetingRoutes.js";

const app = express();
const PORT = process.env.PORT || 5003;

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean) ?? [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        return callback(null, true);
      }
      if (allowedOrigins.length === 0 && process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      console.error(
        `[CORS] Origin ${origin} not allowed. Allowed: ${allowedOrigins.join(", ")}`
      );
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
// Capture raw body for JaaS webhook HMAC (must match bytes JaaS signed, not re-serialized JSON).
app.use(
  express.json({
    verify: (req, _res, buf: Buffer) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);
app.use(cookieParser());

app.use("/api/meetings", meetingRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "Meeting Service is active" });
});

async function start() {
  // Wait for MongoDB before listening so `protect` / shared models don't hang on buffered ops.
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Meeting Service running on port ${PORT}`);
    const publicBase =
      process.env.PUBLIC_WEBHOOK_BASE?.replace(/\/$/, "") ||
      process.env.GATEWAY_URL?.replace(/\/$/, "") ||
      `http://localhost:${PORT}`;
    console.log(
      `[JaaS] Recording pipeline needs a PUBLIC URL. Set PUBLIC_WEBHOOK_BASE or GATEWAY_URL, then in JaaS configure webhook to:\n` +
        `       POST ${publicBase}/api/meetings/webhook\n` +
        `       (localhost is NOT reachable by JaaS — use ngrok/Cloudflare Tunnel in dev.)`
    );
  });
}

void start();

export default app;
