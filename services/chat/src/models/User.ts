import mongoose, { Schema } from "mongoose";

// Minimal definition needed for population (same pattern as project service)
const UserSchema = new Schema(
    {
        _id: Schema.Types.ObjectId,
        email: String,
        profile: {
            firstName: String,
            lastName: String,
            avatarKey: String,
        },
    },
    { strict: false }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
