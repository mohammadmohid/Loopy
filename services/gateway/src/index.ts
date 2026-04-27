import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(helmet());
app.set("trust proxy", 1);

const MY_IP_ADDRESS = "http://192.168.7.15:3000";

const allowedOrigins = ["http://localhost:3000", "https://loopy-mu.vercel.app", MY_IP_ADDRESS];

/**
 * With `app.use("/api/auth", proxy)`, Express strips the mount path before the proxy runs,
 * so `path` is often `/login` instead of `/api/auth/login`. Upstream services mount at
 * `/api/...`, so we must prepend that prefix.
 *
 * If `path` already starts with the prefix (some HPM/Express combinations pass the full URL),
 * return it unchanged to avoid doubling.
 */
function rewriteForUpstream(apiPrefix: string) {
  return (path: string) => {
    const p = path || "/";
    if (p.startsWith(apiPrefix)) return p;
    return apiPrefix + (p.startsWith("/") ? p : `/${p}`);
  };
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        // Origin is allowed
        return callback(null, true);
      } else {
        // Origin is blocked
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Route: Auth Service
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: process.env.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: rewriteForUpstream("/api/auth"),
  })
);

// Route: Project Service
app.use(
  "/api/projects",
  createProxyMiddleware({
    target: process.env.PROJECT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: rewriteForUpstream("/api/projects"),
  })
);

// Route: Meeting Service
app.use(
  "/api/meetings",
  createProxyMiddleware({
    target: process.env.MEETING_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: rewriteForUpstream("/api/meetings"),
  })
);

// Transcription service mounts routes at /transcribe, /:meetingId, etc. — strip this prefix
// so /api/artifacts/transcribe → /transcribe (same as other services' rewriteForUpstream pattern).
app.use(
  "/api/artifacts",
  createProxyMiddleware({
    target: process.env.TRANSCRIPTION_SERVICE_URL || "http://localhost:4002",
    changeOrigin: true,
    pathRewrite: (pathname: string) => {
      const p = pathname || "/";
      if (p.startsWith("/api/artifacts")) {
        const rest = p.slice("/api/artifacts".length);
        if (!rest || rest === "") return "/";
        return rest.startsWith("/") ? rest : `/${rest}`;
      }
      return p;
    },
  })
);

// Route: Chat Service (default port matches services/chat)
app.use(
  "/api/chat",
  createProxyMiddleware({
    target: process.env.CHAT_SERVICE_URL || "http://localhost:5005",
    changeOrigin: true,
    pathRewrite: rewriteForUpstream("/api/chat"),
  })
);

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});
