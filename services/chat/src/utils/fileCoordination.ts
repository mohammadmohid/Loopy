import axios from "axios";

/**
 * Extracts JWT token from Authorization header
 */
const getTokenFromRequest = (req: any): string | null => {
  if (req.cookies?.token) return req.cookies.token;
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.substring(7);
};

/**
 * Registers a message file attachment with the file service
 * Links the file to the channel via sourceContext
 */
export const registerMessageFileAttachment = async (
  fileId: string,
  messageId: string,
  channelId: string,
  workspaceId: string,
  req: any
): Promise<void> => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      console.warn("No token available for file registration");
      return;
    }

    const fileServiceUrl = process.env.FILE_SERVICE_URL || "http://file:5006";
    
    // Update the file's sourceContext to link it to the message
    await axios.patch(
      `${fileServiceUrl}/api/files/files/${fileId}`,
      {
        sourceContext: {
          type: "CHAT_MESSAGE",
          id: messageId,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Workspace-Id": workspaceId,
          "X-Internal-Service": "chat-service",
        },
      }
    );
  } catch (error: any) {
    console.error("Failed to register message file attachment:", error.message);
    // Don't throw - attachment registration failure shouldn't block message operations
  }
};

/**
 * Registers a channel attachment folder with the file service
 */
export const ensureChannelFileFolder = async (
  channelId: string,
  channelName: string,
  workspaceId: string,
  req: any
): Promise<string | null> => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      console.warn("No token available for folder creation");
      return null;
    }

    const fileServiceUrl = process.env.FILE_SERVICE_URL || "http://file:5006";
    
    // Check if folder exists, if not create it
    const response = await axios.post(
      `${fileServiceUrl}/api/files/folders`,
      {
        name: `Channel - ${channelName}`,
        parentId: null,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Workspace-Id": workspaceId,
        },
      }
    );
    
    return response.data?.folder?._id || null;
  } catch (error: any) {
    console.error("Failed to ensure channel file folder:", error.message);
    return null;
  }
};
