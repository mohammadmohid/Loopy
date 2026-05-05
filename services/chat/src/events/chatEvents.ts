import axios from "axios";

function getFileServiceBase(): string {
  const raw = process.env.FILE_SERVICE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:5006";
}

/**
 * Syncs a channel folder with the file service via the sync webhook.
 */
export const notifyFileServiceSyncChannel = async (data: {
  action: "created" | "updated" | "archived" | "deleted";
  channelId: string;
  channelName: string;
  channelType?: string;
  workspaceId: string;
}): Promise<void> => {
  const fileBase = getFileServiceBase();
  try {
    await axios.post(`${fileBase}/api/files/sync/channel`, data, {
      headers: {
        "X-Internal-Call": "true",
        "X-Workspace-Id": data.workspaceId,
      },
    });
    console.log(`[Event] Synced channel folder: ${data.action} ${data.channelName}`);
  } catch (error) {
    console.error(`[Event] Failed to sync channel folder ${data.channelName}:`, error);
    // Don't throw - folder sync is not critical
  }
};

/**
 * Called when a new channel is created to create corresponding file folder
 */
export const onChannelCreated = async (data: {
  channelId: string;
  channelName: string;
  channelType?: string;
  workspaceId: string;
}): Promise<void> => {
  notifyFileServiceSyncChannel({
    action: "created",
    channelId: data.channelId,
    channelName: data.channelName,
    channelType: data.channelType,
    workspaceId: data.workspaceId,
  }).catch(() => {});
};

/**
 * Called when a channel is deleted or archived
 */
export const onChannelDeleted = async (data: {
  channelId: string;
  channelName: string;
  workspaceId: string;
}): Promise<void> => {
  notifyFileServiceSyncChannel({
    action: "deleted",
    channelId: data.channelId,
    channelName: data.channelName,
    workspaceId: data.workspaceId,
  }).catch(() => {});
};
