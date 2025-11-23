import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, minLength: 8, required: true },
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
    organizationId: { type: String },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  // don't re-hash if password wasn't modified
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);
