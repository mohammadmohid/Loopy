import { Response } from "express";
import { Artifact, TranscriptionStatus, AuthRequest } from "@loopy/shared";
import {
  findByMeetingId,
  findByMeetingIdWithRecordingUrl,
} from "../repositories/artifactRepository.js";
import { syncArtifactActionProposalsFromSummary } from "../lib/syncActionProposals.js";
import { findMeetingLeanForActions } from "../lib/meetingSummaryContext.js";
import {
  transcribeFromUrl,
  applySpeakerDisplayNamesToText,
  normalizeRecordingUrlForDeepgram,
} from "../services/transcriptionService.js";
import { generateSummary, answerQuestion } from "../services/aiService.js";
import { loadMeetingSummaryContext } from "../lib/meetingSummaryContext.js";

// Trigger Transcription
export const startTranscription = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { meetingId, projectId, recordingUrl, filename, forceRetry } = req.body as {
      meetingId?: string;
      projectId?: string;
      recordingUrl?: string;
      filename?: string;
      forceRetry?: boolean;
    };

    if (!meetingId || !projectId || !recordingUrl) {
      res.status(400).json({ message: "meetingId, projectId, and recordingUrl are required." });
      return;
    }

    let resolvedRecordingUrl: string;
    try {
      resolvedRecordingUrl = normalizeRecordingUrlForDeepgram(recordingUrl);
    } catch (normErr) {
      if (forceRetry) {
        const withStored = await findByMeetingIdWithRecordingUrl(String(meetingId));
        const fallback = withStored?.recordingUrl?.trim();
        if (fallback) {
          try {
            resolvedRecordingUrl = normalizeRecordingUrlForDeepgram(fallback);
          } catch {
            const msg = normErr instanceof Error ? normErr.message : String(normErr);
            res.status(400).json({
              message:
                "recordingUrl from the meeting is invalid for transcription, and the stored artifact URL could not be used either.",
              detail: msg,
            });
            return;
          }
        } else {
          const msg = normErr instanceof Error ? normErr.message : String(normErr);
          res.status(400).json({
            message:
              "recordingUrl must be a full https:// link to the audio/video file (Deepgram could not parse it).",
            detail: msg,
          });
          return;
        }
      } else {
        const msg = normErr instanceof Error ? normErr.message : String(normErr);
        res.status(400).json({
          message:
            "recordingUrl must be a full https:// link to the audio/video file (Deepgram could not parse it).",
          detail: msg,
        });
        return;
      }
    }

    // Check if already exists
    let artifact = await findByMeetingId(meetingId);

    if (artifact) {
      if (artifact.transcriptionStatus === TranscriptionStatus.COMPLETED && !forceRetry) {
        res.status(200).json({ message: "Already completed", artifact });
        return;
      }
      // Retry / force re-run: reset status (and clear stale output when forcing from COMPLETED)
      artifact.transcriptionStatus = TranscriptionStatus.PROCESSING;
      if (forceRetry) {
        artifact.transcriptJson = undefined;
        artifact.summary = undefined;
        artifact.error = undefined;
        artifact.actionProposals = [];
        artifact.markModified("actionProposals");
      }
      artifact.recordingUrl = resolvedRecordingUrl;
      await artifact.save();
    } else {
      artifact = await Artifact.create({
        meetingId,
        projectId,
        recordingUrl: resolvedRecordingUrl,
        filename,
        transcriptionStatus: TranscriptionStatus.PROCESSING,
      });
    }

    // Respond immediately so the caller isn't blocked
    res.status(200).json({ message: "Transcription started", artifactId: artifact!._id });

    // Background pipeline
    (async () => {
      try {
        const transcript = await transcribeFromUrl(resolvedRecordingUrl);
        const ctx = await loadMeetingSummaryContext(String(meetingId));

        const textForNlp = applySpeakerDisplayNamesToText(
          transcript.raw,
          ctx.speakerDisplayNames
        );

        // Persist transcript before OpenRouter; attach UI speaker labels from the meeting roster.
        artifact!.transcriptJson = {
          ...transcript.raw,
          speakerDisplayNames: ctx.speakerDisplayNames,
          text: textForNlp || transcript.raw.text,
        };
        artifact!.transcriptionStatus = TranscriptionStatus.PROCESSING;
        await artifact!.save();

        const summaryText = await generateSummary(textForNlp || String(transcript.raw?.text ?? ""), {
          title: ctx.meetingTitle || String(filename || "Meeting"),
          date: new Date().toLocaleString(),
          participantLines: ctx.participantLines,
          hostDisplayName: ctx.hostDisplayName,
        });

        artifact!.transcriptionStatus = TranscriptionStatus.COMPLETED;
        artifact!.summary = summaryText;
        syncArtifactActionProposalsFromSummary(artifact!);
        await artifact!.save();

        console.log(`[Transcription] Pipeline complete for meeting ${meetingId}`);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Transcription] Pipeline failed for ${meetingId}:`, message);
        artifact!.transcriptionStatus = TranscriptionStatus.FAILED;
        artifact!.error = message;
        await artifact!.save();
      }
    })();
  } catch (error) {
    console.error("[Transcription] Controller Error:", error);
    res.status(500).json({ message: "Failed to init transcription" });
  }
};

// Get Artifact
export const getArtifact = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { meetingId } = req.params;
    const artifact = await findByMeetingId(meetingId);

    if (!artifact) {
      res.status(404).json({ message: "Artifact not found" });
      return;
    }

    const meeting = await findMeetingLeanForActions(meetingId);
    const uid = req.user?.id != null ? String(req.user.id) : "";
    const isHost = Boolean(meeting && uid && String(meeting.hostId) === uid);

    /* Older artifacts or stricter parsers may have left proposals empty; backfill once for hosts. */
    if (isHost && artifact.summary?.trim()) {
      const existing = artifact.actionProposals;
      const isEmpty =
        !existing || !Array.isArray(existing) || existing.length === 0;
      if (isEmpty) {
        syncArtifactActionProposalsFromSummary(artifact);
        if ((artifact.actionProposals?.length ?? 0) > 0) {
          await artifact.save();
        }
      }
    }

    const payload = artifact.toObject ? artifact.toObject() : { ...artifact };
    if (!isHost && payload && typeof payload === "object" && "actionProposals" in payload) {
      delete (payload as { actionProposals?: unknown }).actionProposals;
    }

    res.status(200).json(payload);
  } catch (error) {
    console.error("[Transcription] Get Artifact Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Manual Summary
export const triggerSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { meetingId, meetingTitle, date } = req.body;

    if (!meetingId) {
      res.status(400).json({ message: "meetingId is required." });
      return;
    }

    const artifact = await findByMeetingId(meetingId);

    if (!artifact || !artifact.transcriptJson) {
      res.status(404).json({ message: "Transcript not found. Cannot summarize." });
      return;
    }

    // Respond immediately to prevent gateway 504 timeouts
    res.status(200).json({ message: "Summary generation started", artifactId: artifact._id });

    // Background AI task
    (async () => {
      try {
        const fullText = artifact.transcriptJson!.text as string;
        const ctx = await loadMeetingSummaryContext(String(meetingId));
        const summaryText = await generateSummary(fullText, {
          title: meetingTitle || ctx.meetingTitle,
          date: date || new Date().toISOString(),
          participantLines: ctx.participantLines,
          hostDisplayName: ctx.hostDisplayName,
        });

        artifact.summary = summaryText;
        syncArtifactActionProposalsFromSummary(artifact);
        await artifact.save();
        console.log(`[Summary] Generated for meeting ${meetingId}`);
      } catch (bgError: unknown) {
        const message = bgError instanceof Error ? bgError.message : String(bgError);
        console.error("[Summary] Background generation failed:", message);
        artifact.summary = "Summary generation failed. Please try again.";
        syncArtifactActionProposalsFromSummary(artifact);
        await artifact.save();
      }
    })();
  } catch (error) {
    console.error("[Summary] Request Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to init summary" });
    }
  }
};

// Update Summary (Manual Edit)
export const updateSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { meetingId } = req.params;
    const { minutes } = req.body;

    if (!minutes) {
      res.status(400).json({ message: "Minutes content is required." });
      return;
    }

    const artifact = await findByMeetingId(meetingId);

    if (!artifact) {
      res.status(404).json({ message: "Artifact not found." });
      return;
    }

    artifact.summary = minutes;
    syncArtifactActionProposalsFromSummary(artifact);
    await artifact.save();

    res.status(200).json({ message: "Minutes updated successfully", artifact });
  } catch (error) {
    console.error("[Summary] Update Error:", error);
    res.status(500).json({ message: "Failed to update summary." });
  }
};

// Chat with Transcript using NLP
export const askBot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { meetingId } = req.params;
    const { question } = req.body;

    if (!question) {
      res.status(400).json({ message: "Question is required." });
      return;
    }

    const artifact = await findByMeetingId(meetingId);

    if (!artifact || !artifact.transcriptJson) {
      res.status(404).json({ message: "Artifact or transcript not found." });
      return;
    }

    const fullText = artifact.transcriptJson!.text as string;
    const answer = await answerQuestion(fullText, question);

    res.status(200).json({ answer });
  } catch (error) {
    console.error("[AskBot] Error:", error);
    res.status(500).json({ message: "Failed to generate answer." });
  }
};
