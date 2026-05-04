import { requireRedisClient } from "../../utils/redis.js";

export const UPLOAD_TRACKER_TTL_SECONDS = 24 * 60 * 60;

export type UploadStatus = "PENDING" | "UPLOADING" | "COMPLETED" | "FAILED";

export interface UploadTrackerState {
  totalParts: number;
  completedParts: number;
  status: UploadStatus;
}

export const getUploadTrackerKey = (uploadId: string) => `upload:${uploadId}`;

export const initializeUploadTracker = async (
  uploadId: string,
  totalParts: number,
  status: UploadStatus = "UPLOADING"
) => {
  const redis = requireRedisClient();
  const key = getUploadTrackerKey(uploadId);
  const pipeline = redis.pipeline();

  pipeline.hset(key, {
    totalParts: Math.max(totalParts, 0),
    completedParts: 0,
    status,
  });
  pipeline.expire(key, UPLOAD_TRACKER_TTL_SECONDS);

  await pipeline.exec();
};

export const incrementCompletedParts = async (
  uploadId: string,
  incrementBy: number = 1
) => {
  const redis = requireRedisClient();
  const key = getUploadTrackerKey(uploadId);
  const nextCount = await redis.hincrby(
    key,
    "completedParts",
    Math.max(incrementBy, 1)
  );
  await redis.expire(key, UPLOAD_TRACKER_TTL_SECONDS);
  return Number(nextCount);
};

export const setUploadStatus = async (uploadId: string, status: UploadStatus) => {
  const redis = requireRedisClient();
  const key = getUploadTrackerKey(uploadId);
  await redis.hset(key, { status });
  await redis.expire(key, UPLOAD_TRACKER_TTL_SECONDS);
};

export const getUploadState = async (
  uploadId: string
): Promise<UploadTrackerState | null> => {
  const redis = requireRedisClient();
  const key = getUploadTrackerKey(uploadId);
  const state = await redis.hgetall<Record<string, string | number>>(key);

  if (!state || Object.keys(state).length === 0) {
    return null;
  }

  return {
    totalParts: Number(state.totalParts ?? 0),
    completedParts: Number(state.completedParts ?? 0),
    status: String(state.status ?? "PENDING") as UploadStatus,
  };
};

export const clearUploadTracker = async (uploadId: string) => {
  const redis = requireRedisClient();
  await redis.del(getUploadTrackerKey(uploadId));
};
