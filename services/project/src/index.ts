import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import projectRoutes from "./routes/projectRoutes";

dotenv.config();

const app = express();

const allowedOrigins = ["http://localhost:3000", "https://loopy-mu.vercel.app"];

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

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("ProjectDB Connected"))
  .catch((err) => console.error(err));

app.use("/api/projects", projectRoutes);

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => console.log(`Project Service running on port ${PORT}`));
