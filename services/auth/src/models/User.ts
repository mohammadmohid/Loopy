import mongoose, { Document, Schema } from "mongoose";
<<<<<<< HEAD
=======
import "./Workspace.js";
>>>>>>> 2000e39 (feat: Workspace added)
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  email: string;
  password?: string;
  globalRole: "ADMIN" | "USER";
<<<<<<< HEAD
=======
  isEmailConfirmed: boolean;
  workspaces: mongoose.Types.ObjectId[];
  activeWorkspace?: mongoose.Types.ObjectId;
>>>>>>> 2000e39 (feat: Workspace added)
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
<<<<<<< HEAD
      enum: ["ADMIN", "USER","PROJECT_MANAGER", "TEAM_MEMBER", "TEAM_LEAD"],
      default: "USER",
    },
=======
      enum: ["ADMIN", "USER", "PROJECT_MANAGER", "TEAM_MEMBER", "TEAM_LEAD"],
      default: "USER",
    },
    isEmailConfirmed: { type: Boolean, default: false },
    workspaces: [{ type: Schema.Types.ObjectId, ref: "Workspace" }],
    activeWorkspace: { type: Schema.Types.ObjectId, ref: "Workspace" },
>>>>>>> 2000e39 (feat: Workspace added)
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
