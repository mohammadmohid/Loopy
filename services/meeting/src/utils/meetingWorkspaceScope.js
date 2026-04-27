import mongoose from "mongoose";
import ProjectRead from "../models/ProjectRead.js";

/**
 * Project _id strings for the given workspace (for legacy meetings without meeting.workspaceId).
 */
export async function projectIdsForWorkspace(workspaceIdStr) {
  if (!workspaceIdStr || !mongoose.isValidObjectId(workspaceIdStr)) return [];
  const rows = await ProjectRead.find({
    workspaceId: new mongoose.Types.ObjectId(String(workspaceIdStr)),
  })
    .select("_id")
    .lean();
  return rows.map((r) => String(r._id));
}

/**
 * True if this meeting should appear in the active workspace (explicit workspaceId or legacy via project).
 */
export async function meetingBelongsToActiveWorkspace(meeting, workspaceIdStr) {
  if (!meeting || !workspaceIdStr) return false;
  const ws = String(workspaceIdStr);
  const mws = meeting.workspaceId != null ? String(meeting.workspaceId) : "";
  if (mws && mws === ws) return true;
  if (!mws || mws === "") {
    const ids = await projectIdsForWorkspace(ws);
    return ids.includes(String(meeting.projectId));
  }
  return false;
}

/**
 * Mongo filter: user is host or participant AND meeting is tied to this workspace (field or legacy project).
 */
export async function workspaceScopedMeetingQuery(userId, workspaceIdStr) {
  const projectIds = await projectIdsForWorkspace(workspaceIdStr);
  return {
    $and: [
      { $or: [{ hostId: userId }, { participants: userId }] },
      {
        $or: [
          { workspaceId: String(workspaceIdStr) },
          {
            $and: [
              {
                $or: [
                  { workspaceId: null },
                  { workspaceId: "" },
                  { workspaceId: { $exists: false } },
                ],
              },
              { projectId: { $in: projectIds } },
            ],
          },
        ],
      },
    ],
  };
}
