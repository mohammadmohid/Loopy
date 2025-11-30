import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  email: string;
  password?: string;
  globalRole: "ADMIN" | "USER";
  profile: {
    firstName: string;
    lastName: string;
    avatarKey?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    password: { type: String, minLength: 8, required: true, select: false },
    globalRole: {
      type: String,
      enum: ["ADMIN", "USER"],
      default: "USER",
    },
    profile: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      avatarKey: { type: String },
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password as string);
};

export default mongoose.model<IUser>("User", userSchema);
