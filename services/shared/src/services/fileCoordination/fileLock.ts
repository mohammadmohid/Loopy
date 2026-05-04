import { requireRedisClient } from "../../utils/redis.js";

export const FILE_LOCK_TTL_SECONDS = 300;

export const getFileLockKey = (fileId: string) => `lock:file:${fileId}`;

export const acquireFileLock = async (
  fileId: string,
  userId: string,
  ttlSeconds: number = FILE_LOCK_TTL_SECONDS
) => {
  const redis = requireRedisClient();
  const result = await redis.set(getFileLockKey(fileId), userId, {
    nx: true,
    ex: Math.max(ttlSeconds, 1),
  });

  return result === "OK";
};

export const getFileLockOwner = async (fileId: string): Promise<string | null> => {
  const redis = requireRedisClient();
  const owner = await redis.get<string>(getFileLockKey(fileId));
  return owner ?? null;
};

export const releaseFileLock = async (fileId: string, userId: string) => {
  const redis = requireRedisClient();
  const key = getFileLockKey(fileId);
  const script = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

  const released = await redis.eval(script, [key], [userId]);
  return Number(released) === 1;
};
