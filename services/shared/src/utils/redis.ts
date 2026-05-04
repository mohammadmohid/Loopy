import { Redis } from "@upstash/redis";

let client: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (client) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — running without cache"
    );
    return null;
  }

  try {
    client = new Redis({ url, token });
    return client;
  } catch (err: any) {
    console.error("[Redis] Failed to create client:", err.message);
    return null;
  }
}

export function requireRedisClient(): Redis {
  const redis = getRedisClient();
  if (!redis) {
    throw new Error(
      "Upstash Redis is not configured. Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN."
    );
  }
  return redis;
}
