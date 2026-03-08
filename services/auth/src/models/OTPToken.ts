import mongoose, { Document, Schema } from "mongoose";

export interface IOTPToken extends Document {
    userId: mongoose.Types.ObjectId;
    code: string;
    expiresAt: Date;
}

const OTPTokenSchema = new Schema<IOTPToken>({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export default mongoose.model<IOTPToken>("OTPToken", OTPTokenSchema);
