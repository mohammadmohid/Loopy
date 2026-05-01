import mongoose from "mongoose";
import { AuthRequest } from "@loopy/shared";
import Team from "./models/Team";

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
