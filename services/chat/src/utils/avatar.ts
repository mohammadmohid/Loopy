import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "../config/r2";

export const getAvatarUrl = async (key?: string) => {
  if (!key) return null;
  if (/^https?:\/\//.test(key)) return key;
  try {
    const r2 = getR2Client();
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });
    return await getSignedUrl(r2, command, { expiresIn: 86400 });
  } catch (error) {
    console.error("Error signing avatar URL:", error);
    return null;
  }
};

export const createAvatarResolver = () => {
    const cache = new Map<string, string | null>();
    return async (key?: string) => {
        if (!key) return null;
        if (cache.has(key)) return cache.get(key)!;
        const url = await getAvatarUrl(key);
        cache.set(key, url);
        return url;
    };
};

export const populateChannelAvatars = async (channel: any, resolveAvatar: (key?: string) => Promise<string | null>) => {
    if (!channel || !channel.members) return channel;
    for (const member of channel.members) {
        if (member.user && member.user.profile) {
            const key = member.user.profile.avatarKey;
            if (key) {
                member.user.profile.avatarUrl = await resolveAvatar(key);
            }
        }
    }
    return channel;
};
