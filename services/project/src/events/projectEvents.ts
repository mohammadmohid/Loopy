import axios from "axios";

/** Read at call time (not module load) so `./env.js` runs before routes import this file. */
function getChatServiceBase(): string | null {
  const raw = process.env.CHAT_SERVICE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    console.warn("[projectEvents] CHAT_SERVICE_URL is not set; skipping chat webhooks");
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

export const notifyProjectCreated = async (data: {
  projectId: string;
  projectName: string;
  members: string[];
  createdBy: string;
  workspaceId: string;
}): Promise<void> => {
  const base = getChatServiceBase();
  if (!base) return;
  try {
    await retryAxios(() =>
      axios.post(`${base}/api/chat/channels/project-webhook`, data)
    );
    console.log(`[Event] Created chat channel for project ${data.projectId}`);
  } catch (error) {
    console.error(`[Event] Failed to create chat channel for project ${data.projectId}:`, error);
  }
};

export const notifyProjectDeleted = async (projectId: string): Promise<void> => {
  const base = getChatServiceBase();
  if (!base) return;
  try {
    await retryAxios(() =>
      axios.delete(`${base}/api/chat/channels/project-webhook/${projectId}`)
    );
    console.log(`[Event] Deleted chat channel for project ${projectId}`);
  } catch (error) {
    console.error(`[Event] Failed to delete chat channel for project ${projectId}:`, error);
  }
};

export const notifyTeamCreated = async (data: {
  teamId: string;
  teamName: string;
  members: string[];
  leaderId: string;
  workspaceId: string;
}): Promise<void> => {
  const base = getChatServiceBase();
  if (!base) return;
  try {
    await retryAxios(() =>
      axios.post(`${base}/api/chat/channels/team-webhook`, data)
    );
    console.log(`[Event] Created chat channel for team ${data.teamId}`);
  } catch (error) {
    console.error(`[Event] Failed to create chat channel for team ${data.teamId}:`, error);
  }
};

export const notifyTeamUpdated = async (data: {
  teamId: string;
  teamName: string;
  members: string[];
  leaderId: string;
  workspaceId: string;
}): Promise<void> => {
  const base = getChatServiceBase();
  if (!base) return;
  try {
    await retryAxios(() =>
      axios.post(`${base}/api/chat/channels/team-webhook`, data)
    );
    console.log(`[Event] Updated chat channel for team ${data.teamId}`);
  } catch (error) {
    console.error(`[Event] Failed to update chat channel for team ${data.teamId}:`, error);
  }
};

export const notifyTeamDeleted = async (teamId: string): Promise<void> => {
  const base = getChatServiceBase();
  if (!base) return;
  try {
    await retryAxios(() =>
      axios.delete(`${base}/api/chat/channels/team-webhook/${teamId}`)
    );
    console.log(`[Event] Deleted chat channel for team ${teamId}`);
  } catch (error) {
    console.error(`[Event] Failed to delete chat channel for team ${teamId}:`, error);
  }
};
