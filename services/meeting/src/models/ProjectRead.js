import mongoose from "mongoose";

/**
 * Read-only access to project service `projects` collection (same MongoDB) for workspace scoping.
 */
const projectReadSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, index: true },
  },
  { collection: "projects", strict: false }
);

export default mongoose.models.ProjectRead || mongoose.model("ProjectRead", projectReadSchema);
