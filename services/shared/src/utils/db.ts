import mongoose from "mongoose";

let isConnected = false;

export const connectDB = async (uri?: string) => {
  mongoose.set("strictQuery", true);

  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoUri = uri || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is not defined in environment variables");
  }

  try {
    const db = await mongoose.connect(mongoUri, {
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    isConnected = db.connections[0].readyState === 1;
    console.log(`MongoDB Connected: ${db.connection.host}`);
    return db.connection;
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    throw error;
  }
};
