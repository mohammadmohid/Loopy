import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string, {
      serverSelectionTimeoutMS: 5000, // Fail fast (5s) instead of buffering for 10s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4, // Force IPv4 (often fixes Docker/VPS DNS issues)
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};
