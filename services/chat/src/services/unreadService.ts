import { getRedisClient } from "../config/redis";

const UNREAD_PREFIX = "unread:";

/**
 * Increment unread count for a specific user + channel.
 * Called when a new message is sent in a channel.
 */
export async function incrementUnread(userId: string, channelId: string): Promise<void> {
    try {
        const redis = getRedisClient();
        if (!redis) return;
        await redis.hincrby(`${UNREAD_PREFIX}${userId}`, channelId, 1);
    } catch (err: any) {
        console.error("[UnreadService] incrementUnread error:", err.message);
    }
}

/**
 * Increment unread for multiple users at once (batch).
 * Uses Upstash pipeline to batch all HINCRBY commands into one HTTP request.
 */
export async function incrementUnreadBatch(userIds: string[], channelId: string): Promise<void> {
    try {
        const redis = getRedisClient();
        if (!redis || userIds.length === 0) return;

        const pipeline = redis.pipeline();
        for (const userId of userIds) {
            pipeline.hincrby(`${UNREAD_PREFIX}${userId}`, channelId, 1);
        }
        await pipeline.exec();
    } catch (err: any) {
        console.error("[UnreadService] incrementUnreadBatch error:", err.message);
    }
}

/**
 * Clear unread count for a specific user + channel.
 * Called when the user opens / views a channel.
 */
export async function clearUnread(userId: string, channelId: string): Promise<void> {
    try {
        const redis = getRedisClient();
        if (!redis) return;
        await redis.hdel(`${UNREAD_PREFIX}${userId}`, channelId);
    } catch (err: any) {
        console.error("[UnreadService] clearUnread error:", err.message);
    }
}

/**
 * Get all unread counts for a user.
 * Returns a map of channelId → count.
 */
export async function getUnreadCounts(userId: string): Promise<Record<string, number>> {
    try {
        const redis = getRedisClient();
        if (!redis) return {};

        const raw = await redis.hgetall<Record<string, string>>(`${UNREAD_PREFIX}${userId}`);
        if (!raw) return {};

        const counts: Record<string, number> = {};
        for (const [channelId, countStr] of Object.entries(raw)) {
            const n = typeof countStr === "number" ? countStr : parseInt(String(countStr), 10);
            if (n > 0) counts[channelId] = n;
        }
        return counts;
    } catch (err: any) {
        console.error("[UnreadService] getUnreadCounts error:", err.message);
        return {};
    }
}

/**
 * Clear ALL unread counts for a user (e.g., on logout or workspace switch).
 */
export async function clearAllUnread(userId: string): Promise<void> {
    try {
        const redis = getRedisClient();
        if (!redis) return;
        await redis.del(`${UNREAD_PREFIX}${userId}`);
    } catch (err: any) {
        console.error("[UnreadService] clearAllUnread error:", err.message);
    }
}
