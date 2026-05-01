import axios from "axios";

function getChatServiceBase(): string | null {
  const raw = process.env.CHAT_SERVICE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    console.warn("[authEvents] CHAT_SERVICE_URL is not set; skipping chat webhooks");
    return null;
  }
  return "http://localhost:5004";
}

const retryAxios = async (fn: () => Promise<any>, retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export const notifyWorkspaceMemberSync = async (data: {
  workspaceId: string;
  userId: string;
}): Promise<void> => {
  const base = getChatServiceBase();
  if (!base) return;
  try {
    await retryAxios(() =>
      axios.post(`${base}/api/chat/channels/member-webhook`, data)
    );
    console.log(`[Event] Synced workspace member for workspace ${data.workspaceId}`);
  } catch (error) {
    console.error(`[Event] Failed to sync workspace member for workspace ${data.workspaceId}:`, error);
  }
};
