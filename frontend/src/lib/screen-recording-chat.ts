import { apiRequest } from "@/lib/api";
import type { Channel } from "@/lib/types";

export type ScreenRecordingRecipient = {
  id: string;
  name: string;
};

export type RecordingChatAttachment = {
  fileId: string;
  name: string;
  key: string;
  size: number;
  mimeType: string;
};

const RECIPIENTS_STORAGE_KEY = "next_recording_recipients";

export function storeScreenRecordingRecipients(
  sendToIndividual: boolean,
  recipients: ScreenRecordingRecipient[]
) {
  sessionStorage.setItem(
    RECIPIENTS_STORAGE_KEY,
    JSON.stringify({ sendToIndividual, recipients })
  );
}

export function consumeScreenRecordingRecipients(): {
  sendToIndividual: boolean;
  recipients: ScreenRecordingRecipient[];
} | null {
  const raw = sessionStorage.getItem(RECIPIENTS_STORAGE_KEY);
  sessionStorage.removeItem(RECIPIENTS_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      sendToIndividual?: boolean;
      recipients?: ScreenRecordingRecipient[];
    };
    return {
      sendToIndividual: Boolean(parsed.sendToIndividual),
      recipients: Array.isArray(parsed.recipients) ? parsed.recipients : [],
    };
  } catch {
    return null;
  }
}

export async function sendScreenRecordingToUsers(
  recipients: ScreenRecordingRecipient[],
  attachment: RecordingChatAttachment,
  recordingName: string
): Promise<void> {
  const content = `Screen recording "${recordingName}"`;

  for (const recipient of recipients) {
    const channel = await apiRequest<Channel>("/chat/channels", {
      method: "POST",
      data: {
        name: recipient.name,
        type: "direct",
        memberIds: [recipient.id],
      },
    });

    await apiRequest(`/chat/channels/${channel._id}/messages`, {
      method: "POST",
      data: {
        content,
        attachments: [attachment],
      },
    });
  }
}
