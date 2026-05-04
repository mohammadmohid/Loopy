import axios from "axios";

/**
 * Notifies the file service to create a folder for a channel
 */
export const notifyFileServiceCreateChannelFolder = async (data: {
  channelName: string;
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
    console.log(`[Event] Created folder ${data.channelName} in file service`);
  } catch (error) {
    console.error(`[Event] Failed to create channel folder ${data.channelName}:`, error);
    // Don't throw - folder creation is not critical
  }
};

/**
 * Called when a new channel is created to create corresponding file folder
 */
export const onChannelCreated = async (data: {
  channelId: string;
  channelName: string;
  workspaceId: string;
}): Promise<void> => {
  notifyFileServiceCreateChannelFolder({
    channelName: `Channel - ${data.channelName}`,
    workspaceId: data.workspaceId,
  }).catch(() => {});
};
