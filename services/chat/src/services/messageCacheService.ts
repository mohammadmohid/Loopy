import { getRedisClient } from "../config/redis";

const MSG_PREFIX = "msgs:";
const MAX_CACHED = 50;
const TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Push a new message into the channel's Redis list cache.
 * Keeps only the latest MAX_CACHED messages and refreshes TTL.
 */
export async function cacheMessage(channelId: string, message: object): Promise<void> {
    try {
        const redis = getRedisClient();
        if (!redis) return;

        const key = `${MSG_PREFIX}${channelId}`;
        const serialized = JSON.stringify(message);

        // Pipeline: push, trim, set TTL — single HTTP request
        const pipeline = redis.pipeline();
        pipeline.rpush(key, serialized);
        pipeline.ltrim(key, -MAX_CACHED, -1); // Keep only the last MAX_CACHED entries
        pipeline.expire(key, TTL_SECONDS);
        await pipeline.exec();
    } catch (err: any) {
        console.error("[MessageCache] cacheMessage error:", err.message);
    }
}

/**
 * Get cached messages for a channel.
 * Returns null if cache is empty / unavailable (caller should fall back to MongoDB).
 */
export async function getCachedMessages(channelId: string, limit: number = 50): Promise<object[] | null> {
    try {
        const redis = getRedisClient();
        if (!redis) return null;

        const key = `${MSG_PREFIX}${channelId}`;
        const count = await redis.llen(key);
        if (count === 0) return null;

        // Get the last `limit` items
        const start = Math.max(count - limit, 0);
        const raw = await redis.lrange<string>(key, start, -1);

        if (!raw || raw.length === 0) return null;

        return raw.map((item) => {
            // @upstash/redis may auto-deserialize JSON strings
            if (typeof item === "object") return item;
            return JSON.parse(item);
        });
    } catch (err: any) {
        console.error("[MessageCache] getCachedMessages error:", err.message);
        return null;
    }
}

/**
 * Invalidate (delete) the cache for a channel.
 * Called on message edit/delete to prevent stale data.
 */
export async function invalidateCache(channelId: string): Promise<void> {
    try {
        const redis = getRedisClient();
        if (!redis) return;
        await redis.del(`${MSG_PREFIX}${channelId}`);
    } catch (err: any) {
        console.error("[MessageCache] invalidateCache error:", err.message);
    }
}
