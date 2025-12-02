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

const allowedOrigins = ["http://localhost:3000", "https://loopy-mu.vercel.app"];

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
    pathRewrite: { "^": "/api/auth" },
  })
);

// Route: Project Service
app.use(
  "/api/projects",
  createProxyMiddleware({
    target: process.env.PROJECT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: { "^": "/api/projects" },
  })
);

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});
