import mongoose from "mongoose";
import { connectMongoWithRetry } from "@loopy/shared";

const connectDB = async () => {
  try {
    await connectMongoWithRetry(process.env.MONGO_URI || undefined, { label: "Meeting" });
    const c = mongoose.connection;
    const where =
      c.host ||
      (c.db?.databaseName ? `db=${c.db.databaseName}` : null) ||
      `readyState=${c.readyState}`;
    console.log(`MongoDB Connected: ${where}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
