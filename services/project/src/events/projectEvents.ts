import axios from "axios";


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

export const notifyFileServiceCreateFolder = async (data: {
  folderName: string;
  workspaceId: string;
  parentFolderId?: string;
}): Promise<void> => {
  const FILE_SERVICE_URL = process.env.FILE_SERVICE_URL || "http://file:5006";
  try {
    await axios.post(`${FILE_SERVICE_URL}/api/files/folders`, data, {
      headers: {
        "X-Internal-Call": "true",
      },
    });
    console.log(`[Event] Created folder ${data.folderName} in file service`);
  } catch (error) {
    console.error(`[Event] Failed to create folder ${data.folderName}:`, error);
    // Don't throw - folder creation is not critical
  }
};

export const notifyProjectCreated = async (data: {
  projectId: string;
  projectName: string;
  members: string[];
  createdBy: string;
  workspaceId: string;
}): Promise<void> => {
  const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL;
  try {
    await retryAxios(() =>
      axios.post(`${CHAT_SERVICE_URL}/api/chat/channels/project-webhook`, data)
    );
    console.log(`[Event] Created chat channel for project ${data.projectId}`);
  } catch (error) {
    console.error(`[Event] Failed to create chat channel for project ${data.projectId}:`, error);
  }

  // Fire-and-forget folder creation in file service
  notifyFileServiceCreateFolder({
    folderName: `Project - ${data.projectName}`,
    workspaceId: data.workspaceId,
  }).catch(() => {});
};

export const notifyProjectDeleted = async (projectId: string): Promise<void> => {
  const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL;
  try {
    await retryAxios(() =>
      axios.delete(`${CHAT_SERVICE_URL}/api/chat/channels/project-webhook/${projectId}`)
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
  const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL;
  try {
    await retryAxios(() =>
      axios.post(`${CHAT_SERVICE_URL}/api/chat/channels/team-webhook`, data)
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
  const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL;
  try {
    await retryAxios(() =>
      axios.post(`${CHAT_SERVICE_URL}/api/chat/channels/team-webhook`, data)
    );
    console.log(`[Event] Updated chat channel for team ${data.teamId}`);
  } catch (error) {
    console.error(`[Event] Failed to update chat channel for team ${data.teamId}:`, error);
  }
};

export const notifyTeamDeleted = async (teamId: string): Promise<void> => {
  const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL;
  try {
    await retryAxios(() =>
      axios.delete(`${CHAT_SERVICE_URL}/api/chat/channels/team-webhook/${teamId}`)
    );
    console.log(`[Event] Deleted chat channel for team ${teamId}`);
  } catch (error) {
    console.error(`[Event] Failed to delete chat channel for team ${teamId}:`, error);
  }
};
