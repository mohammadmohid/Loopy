import mongoose, { Document, Schema } from "mongoose";

export interface ITokenBlocklist extends Document {
  jti: string;
  createdAt: Date;
}

const tokenBlocklistSchema = new Schema<ITokenBlocklist>({
  jti: { type: String, required: true, unique: true, maxlength: 500 },
  createdAt: { type: Date, default: Date.now, expires: "1d" }, // Matches JWT expiry
});

export default mongoose.model<ITokenBlocklist>("TokenBlocklist", tokenBlocklistSchema);
