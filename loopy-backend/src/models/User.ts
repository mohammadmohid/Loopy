import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  role:
    | "org_admin"
    | "project_manager"
    | "team_lead"
    | "team_member"
    | "personal";
  organizationId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, minLength: 8, required: true, select: false },
    name: { type: String, required: true },
    role: {
      type: String,
      enum: [
        "org_admin",
        "project_manager",
        "team_lead",
        "team_member",
        "personal",
      ],
      default: "personal",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  // don't re-hash if password wasn't modified
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password as string, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password as string);
};

export default mongoose.model<IUser>("User", userSchema);
