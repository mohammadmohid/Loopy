import { SystemFolderContext } from "../../models/Folder.js";
import { requireRedisClient } from "../../utils/redis.js";

export const SYSTEM_FOLDER_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

type FolderContextInput = SystemFolderContext | string;

const normalizeContext = (context: FolderContextInput) =>
  String(context).toUpperCase();

export const getSystemFolderCacheKey = (
  workspaceId: string,
  context: FolderContextInput
) => `workspace:${workspaceId}:sysfolder:${normalizeContext(context)}`;

export const setSystemFolderId = async (
  workspaceId: string,
  context: FolderContextInput,
  folderId: string,
  ttlSeconds: number = SYSTEM_FOLDER_CACHE_TTL_SECONDS
) => {
  const redis = requireRedisClient();
  await redis.set(getSystemFolderCacheKey(workspaceId, context), folderId, {
    ex: Math.max(ttlSeconds, 1),
  });
};

export const getSystemFolderId = async (
  workspaceId: string,
  context: FolderContextInput
) => {
  const redis = requireRedisClient();
  return (
    (await redis.get<string>(getSystemFolderCacheKey(workspaceId, context))) ??
    null
  );
};

export const warmSystemFolderCache = async (
  workspaceId: string,
  foldersByContext: Partial<Record<SystemFolderContext, string>>
) => {
  const redis = requireRedisClient();
  const pipeline = redis.pipeline();

  for (const [context, folderId] of Object.entries(foldersByContext)) {
    if (!folderId) continue;
    pipeline.set(getSystemFolderCacheKey(workspaceId, context), folderId, {
      ex: SYSTEM_FOLDER_CACHE_TTL_SECONDS,
    });
  }

  await pipeline.exec();
};

export const getOrSetSystemFolderId = async (
  workspaceId: string,
  context: FolderContextInput,
  resolver: () => Promise<string | null>
) => {
  const cached = await getSystemFolderId(workspaceId, context);
  if (cached) return cached;

  const resolved = await resolver();
  if (!resolved) return null;

  await setSystemFolderId(workspaceId, context, resolved);
  return resolved;
};
