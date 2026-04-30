export const getAvatarUrl = async (key?: string) => {
    if (!key) return null;
    if (/^https?:\/\//.test(key)) return key;
    const baseUrl = process.env.GATEWAY_URL;
    return `${baseUrl}/api/auth/avatars/${key}`;
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
