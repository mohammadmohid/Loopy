import mongoose from "mongoose";

const tokenBlocklistSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: "1d" }, // Matches JWT expiry
});

export default mongoose.model("TokenBlocklist", tokenBlocklistSchema);
