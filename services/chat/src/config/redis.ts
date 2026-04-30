import { Redis } from "@upstash/redis";

let client: Redis | null = null;

/**
 * Returns the Upstash Redis client (HTTP-based, no persistent connection).
 * Creates a singleton on first call. Returns `null` if env vars are missing
 * so callers can gracefully fall back to MongoDB.
 */
export function getRedisClient(): Redis | null {
    if (client) return client;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        console.warn("[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — running without cache");
        return null;
    }

    try {
        client = new Redis({ url, token });
        console.log("[Redis] Upstash client initialised (HTTP/REST)");
        return client;
    } catch (err: any) {
        console.error("[Redis] Failed to create client:", err.message);
        return null;
    }
}
