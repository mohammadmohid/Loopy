import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IOTPToken extends Document {
    userId: mongoose.Types.ObjectId;
    code: string;
    expiresAt: Date;
}

const OTPTokenSchema = new Schema<IOTPToken>({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    code: { type: String, required: true, maxlength: 128 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

// Compound index for the primary query pattern: findOne({ userId, code })
OTPTokenSchema.index({ userId: 1, code: 1 });

// Hash OTP code before storage — same security pattern as User password
OTPTokenSchema.pre("save", async function () {
    if (!this.isModified("code")) return;
    const salt = await bcrypt.genSalt(10);
    this.code = await bcrypt.hash(this.code, salt);
});

// Instance method to verify OTP code
OTPTokenSchema.methods.matchCode = async function (enteredCode: string) {
    return await bcrypt.compare(enteredCode, this.code);
};

export default mongoose.model<IOTPToken>("OTPToken", OTPTokenSchema);
