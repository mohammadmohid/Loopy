import mongoose from "mongoose";
import { AuthRequest } from "@loopy/shared";
import Team from "./models/Team.js";
import axios from "axios";

/**
 * Resolves an avatar key to a full URL via the gateway proxy.
 * Returns null if no key is provided.
 */
export const resolveAvatarUrl = (avatarKey?: string): string | null => {
  if (!avatarKey) return null;
  return `${process.env.GATEWAY_URL}/api/auth/avatars/${avatarKey}`;
};

/**
 * Attaches avatarUrl to a populated owner object (lean document).
 */
export const resolveOwnerAvatar = (owner: any): void => {
  if (owner?.profile?.avatarKey) {
    owner.profile.avatarUrl = resolveAvatarUrl(owner.profile.avatarKey);
  }
};

/**
 * Attaches avatarUrl to all populated members in a project (lean document).
 */
export const resolveMemberAvatars = (members: any[]): void => {
  if (!Array.isArray(members)) return;
  for (const m of members) {
    const userObj = m.user as any;
    if (userObj?.profile?.avatarKey) {
      userObj.profile.avatarUrl = resolveAvatarUrl(userObj.profile.avatarKey);
    }
  }
};

/**
 * Builds a MongoDB query scoped by the user's role and workspace.
 * ADMIN/PROJECT_MANAGER see all workspace projects.
 * MEMBER sees only projects they own, are a member of, or belong to via team.
 */
export const buildScopedProjectQuery = async (user: AuthRequest["user"]): Promise<any> => {
  const { id: userId, role, workspaceId } = user!;

  if (!workspaceId) return null;

  const baseQuery: any = { workspaceId };

  if (role === "ADMIN" || role === "PROJECT_MANAGER") {
    return baseQuery;
  }

  // MEMBER role: scope to projects they belong to
  const userTeams = await Team.find({ members: userId }).select("_id").lean();
  const userTeamIds = userTeams.map((t) => t._id);

  return {
    workspaceId,
    $or: [
      { owner: userId },
      { "members.user": userId },
      { "assignedTeams.team": { $in: userTeamIds } },
    ],
  };
};

/**
 * Registers a task attachment with the file service
 * Links the file to the task via sourceContext
 */
export const registerTaskFileAttachment = async (
  fileId: string,
  taskId: string,
  workspaceId: string,
  authToken: string
): Promise<void> => {
  try {
    const fileServiceUrl = process.env.FILE_SERVICE_URL || "http://file:5006";
    
    // Update the file's sourceContext to link it to the task
    await axios.patch(
      `${fileServiceUrl}/api/files/${fileId}`,
      {
        sourceContext: {
          type: "TASK",
          id: taskId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "X-Workspace-Id": workspaceId,
        },
      }
    );
  } catch (error: any) {
    console.error("Failed to register task file attachment:", error.message);
    // Don't throw - attachment registration failure shouldn't block task operations
  }
};

/**
 * Attaches a file to a task by adding it to the attachments array
 */
export const attachFileToTask = async (
  taskId: string,
  fileId: string
): Promise<void> => {
  try {
    const Task = (await import("./models/Task.js")).default;
    await Task.findByIdAndUpdate(
      taskId,
      { $addToSet: { attachments: fileId } },
      { new: true }
    );
  } catch (error: any) {
    console.error("Failed to attach file to task:", error.message);
  }
};

/**
 * Detaches a file from a task
 */
export const detachFileFromTask = async (
  taskId: string,
  fileId: string
): Promise<void> => {
  try {
    const Task = (await import("./models/Task.js")).default;
    await Task.findByIdAndUpdate(
      taskId,
      { $pull: { attachments: fileId } },
      { new: true }
    );
  } catch (error: any) {
    console.error("Failed to detach file from task:", error.message);
  }
};
