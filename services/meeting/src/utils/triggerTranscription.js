import axios from "axios";
import Meeting from "../models/Meeting.js";

async function postTranscriptionStart(url, payload, context) {
  const maxAttempts = 3;
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await axios.post(url, payload, { timeout: 25_000 });
      return res;
    } catch (err) {
      lastErr = err;
      const detail = err.response?.data || err.response?.status || err.message;
      console.warn(
        `[TranscriptionTrigger:${context}] attempt ${attempt}/${maxAttempts} failed:`,
        typeof detail === "string" ? detail : JSON.stringify(detail)
      );
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }
  throw lastErr;
}

/**
 * Fire-and-forget POST to the transcription service so Jitsi webhooks / meeting updates never block.
 * Idempotency is handled inside transcription (Artifact per meetingId).
 */
export function triggerTranscriptionPipeline(
  { meetingId, projectId, recordingUrl, filename },
  context = "meeting-service"
) {
  if (!recordingUrl || !meetingId || !projectId) {
    console.warn(
      `[TranscriptionTrigger:${context}] skip — missing recordingUrl/meetingId/projectId`
    );
    return;
  }

  const base = (process.env.TRANSCRIPTION_SERVICE_URL || "http://localhost:4002").replace(
    /\/$/,
    ""
  );
  const url = `${base}/transcribe`;

  const payload = {
    meetingId: String(meetingId),
    projectId: String(projectId),
    recordingUrl,
    filename: filename || "Meeting",
  };

  void postTranscriptionStart(url, payload, context)
    .then((res) =>
      console.log(
        `[TranscriptionTrigger:${context}] started (${res.status}) meetingId=${payload.meetingId}`
      )
    )
    .catch((err) => {
      const detail = err.response?.data || err.response?.status || err.message;
      console.error(`[TranscriptionTrigger:${context}] failed after retries:`, detail);
    });
}

/**
 * Recording often appears on the meeting document after "ended" (JaaS upload delay).
 * If the initial webhook→transcription POST failed or ordering was wrong, re-check a few times.
 */
export function scheduleTranscriptionCatchUp(meetingId, reason = "recording-delay") {
  if (!meetingId) return;
  const id = String(meetingId);
  const delays = [25_000, 70_000, 150_000];
  delays.forEach((delayMs) => {
    setTimeout(() => {
      void (async () => {
        try {
          const m = await Meeting.findById(id).select("recordingUrl projectId title").lean();
          if (!m?.recordingUrl || !m.projectId) return;
          triggerTranscriptionPipeline(
            {
              meetingId: id,
              projectId: m.projectId,
              recordingUrl: m.recordingUrl,
              filename: m.title || "Meeting",
            },
            `${reason}-${delayMs}ms`
          );
        } catch (e) {
          console.warn(`[TranscriptionCatchUp:${reason}] tick failed:`, e?.message || e);
        }
      })();
    }, delayMs);
  });
}
