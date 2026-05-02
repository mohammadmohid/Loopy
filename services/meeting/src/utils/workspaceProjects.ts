import mongoose from "mongoose";

/**
 * Resolve project `_id`s for a workspace via the `projects` collection (same DB as meeting service).
 */
export async function getProjectIdsInWorkspace(
  workspaceId: string
): Promise<mongoose.Types.ObjectId[]> {
  if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) {
    return [];
  }

  const db = mongoose.connection.db;
  if (!db) {
    console.warn("[Meeting] mongoose.connection.db unavailable for workspace project lookup");
    return [];
  }

  const wsOid = new mongoose.Types.ObjectId(workspaceId);
  const docs = await db
    .collection("projects")
    .find({ workspaceId: wsOid })
    .project({ _id: 1 })
    .toArray();

  return docs.map((d) => d._id as mongoose.Types.ObjectId);
}

export async function isProjectInWorkspace(
  projectId: string,
  workspaceId: string
): Promise<boolean> {
  if (
    !projectId ||
    !workspaceId ||
    !mongoose.Types.ObjectId.isValid(projectId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return false;
  }

  const db = mongoose.connection.db;
  if (!db) return false;

  const found = await db.collection("projects").findOne({
    _id: new mongoose.Types.ObjectId(projectId),
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
  });

  return !!found;
}
