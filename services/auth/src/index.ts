import "./env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();
app.set("trust proxy", 1);

app.use(helmet());
app.use(cookieParser());

const allowedOrigins =
  process.env.ALLOWED_ORIGINS?.split(",")
    .map((o) => o.trim())
    .filter(Boolean) ?? [];

app.use(
  cors({
    origin(origin, callback) {
      // curl / same-origin / server-to-server — no Origin header
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Local dev: empty ALLOWED_ORIGINS would reject every browser request; allow any origin.
      if (allowedOrigins.length === 0 && process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      // Deny without throwing — avoids noisy stack traces on every signup/preflight.
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5001;

async function start() {
  // Wait for DB before listening so @loopy/shared models use the same connected mongoose.
  await connectDB();
  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
  }
}

void start();

export default app;
