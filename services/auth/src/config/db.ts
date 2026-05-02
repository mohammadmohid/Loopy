import mongoose from "mongoose";
import { connectMongoWithRetry } from "@loopy/shared";

export const connectDB = async () => {
  try {
    await connectMongoWithRetry(process.env.MONGO_URI, { label: "Auth" });
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};
