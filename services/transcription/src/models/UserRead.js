import mongoose from "mongoose";

/**
 * Read-only access to auth `users` collection (same MongoDB) for resolving participant names.
 */
const userReadSchema = new mongoose.Schema(
  {
    email: { type: String },
    profile: {
      firstName: { type: String },
      lastName: { type: String },
    },
  },
  { collection: "users", strict: false }
);

export default mongoose.models.UserRead || mongoose.model("UserRead", userReadSchema);
