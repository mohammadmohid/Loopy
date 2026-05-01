import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import connectDB from "./config/db.js";
import meetingRoutes from "./routes/meetingRoutes.js";

dotenv.config();

connectDB();

const app = express();
const PORT = process.env.PORT || 5003;

app.use(helmet());

// Get allowed origins from env
const allowedOrigins = (process.env.ALLOWED_ORIGINS as string) && (process.env.ALLOWED_ORIGINS as string).split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/meetings", meetingRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({ status: "Meeting Service is active" });
});

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Meeting Service running on port ${PORT}`);
  });
}

export default app;