import express from "express";
import cors from "cors";
import helmet from "helmet";
import { createProxyMiddleware } from "http-proxy-middleware";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(helmet());
app.set("trust proxy", 1);

const isProduction = process.env.NODE_ENV === "production";
const rateLimitDisabled =
  !isProduction ||
  process.env.DISABLE_GATEWAY_RATE_LIMIT === "true" ||
  process.env.DISABLE_GATEWAY_RATE_LIMIT === "1";

// Production: protect the gateway. Local dev: same IP (localhost) + SWR/polling burns 100/15min fast → 429 on meetings/chat.
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  message: "Too many requests from this IP, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => rateLimitDisabled,
});
app.use(limiter as any);

// Get allowed origins from env
const allowedOrigins =
  (process.env.ALLOWED_ORIGINS as string) && (process.env.ALLOWED_ORIGINS as string).split(",");

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

// Express strips the mount prefix before forwarding to proxy middleware.
// Our microservices expect the full prefix (e.g. /api/auth/login not /login).
// This helper re-attaches the prefix while guarding against double-prefixing.
function rewriteForUpstream(apiPrefix: string) {
  return (path: string) => {
    const p = path || "/";
    if (p.startsWith(apiPrefix)) return p;
    return apiPrefix + (p.startsWith("/") ? p : `/${p}`);
  };
}

interface ServiceRoute {
  prefix: string;
  targetEnvVar: string;
}

const SERVICE_ROUTES: ServiceRoute[] = [
  { prefix: "/api/auth", targetEnvVar: "AUTH_SERVICE_URL" },
  { prefix: "/api/projects", targetEnvVar: "PROJECT_SERVICE_URL" },
  { prefix: "/api/notifications", targetEnvVar: "PROJECT_SERVICE_URL" },
  { prefix: "/api/meetings", targetEnvVar: "MEETING_SERVICE_URL" },
  { prefix: "/api/artifacts", targetEnvVar: "TRANSCRIPTION_SERVICE_URL" },
  { prefix: "/api/chat", targetEnvVar: "CHAT_SERVICE_URL" },
];

for (const route of SERVICE_ROUTES) {
  const target = process.env[route.targetEnvVar];
  if (!target) {
    console.warn(`[Gateway] ${route.targetEnvVar} is not set — skipping ${route.prefix}`);
    continue;
  }

  app.use(
    route.prefix,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      pathRewrite: rewriteForUpstream(route.prefix),
    })
  );
}

app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});
