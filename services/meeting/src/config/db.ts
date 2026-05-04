import mongoose from "mongoose";
import { connectMongoWithRetry } from "@loopy/shared";

const connectDB = async () => {
  try {
    await connectMongoWithRetry(process.env.MONGO_URI || undefined, { label: "Meeting" });
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
