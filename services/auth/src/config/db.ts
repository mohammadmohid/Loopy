import { connectDB as sharedConnectDB } from "@loopy/shared";

export const connectDB = async () => {
  try {
    await sharedConnectDB();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
    throw error;
  }
};


