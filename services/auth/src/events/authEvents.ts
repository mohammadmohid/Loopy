import axios from "axios";

const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL;

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
  try {
    await retryAxios(() =>
      axios.post(`${CHAT_SERVICE_URL}/api/chat/channels/member-webhook`, data)
    );
    console.log(`[Event] Synced workspace member for workspace ${data.workspaceId}`);
  } catch (error) {
    console.error(`[Event] Failed to sync workspace member for workspace ${data.workspaceId}:`, error);
  }
};
