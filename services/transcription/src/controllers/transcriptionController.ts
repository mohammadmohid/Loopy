import { Request, Response } from "express";
import { Artifact, TranscriptionStatus } from "@loopy/shared";
import { findByMeetingId } from "../repositories/artifactRepository.js";
import { transcribeFromUrl } from "../services/transcriptionService.js";
import { generateSummary, answerQuestion } from "../services/aiService.js";

// Trigger Transcription
export const startTranscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const { meetingId, projectId, recordingUrl, filename } = req.body;

    if (!meetingId || !projectId || !recordingUrl) {
      res.status(400).json({ message: "meetingId, projectId, and recordingUrl are required." });
      return;
    }

    // Check if already exists
    let artifact = await findByMeetingId(meetingId);

    if (artifact) {
      if (artifact.transcriptionStatus === TranscriptionStatus.COMPLETED) {
        res.status(200).json({ message: "Already completed", artifact });
        return;
      }
      // Retry: reset status for failed/pending
      artifact.transcriptionStatus = TranscriptionStatus.PROCESSING;
      await artifact.save();
    } else {
      artifact = await Artifact.create({
        meetingId,
        projectId,
        recordingUrl,
        filename,
        transcriptionStatus: TranscriptionStatus.PROCESSING,
      });
    }

    // Respond immediately so the caller isn't blocked
    res.status(200).json({ message: "Transcription started", artifactId: artifact!._id });

    // Background pipeline
    (async () => {
      try {
        const transcript = await transcribeFromUrl(recordingUrl);

        const summaryText = await generateSummary(transcript.raw.text, {
          title: filename,
          date: new Date().toLocaleString(),
        });

        artifact!.transcriptionStatus = TranscriptionStatus.COMPLETED;
        artifact!.transcriptJson = transcript.raw;
        artifact!.summary = summaryText;
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
export const getArtifact = async (req: Request, res: Response): Promise<void> => {
  try {
    const { meetingId } = req.params;
    const artifact = await findByMeetingId(meetingId);

    if (!artifact) {
      res.status(404).json({ message: "Artifact not found" });
      return;
    }

    res.status(200).json(artifact);
  } catch (error) {
    console.error("[Transcription] Get Artifact Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Manual Summary
export const triggerSummary = async (req: Request, res: Response): Promise<void> => {
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
        const summaryText = await generateSummary(fullText, { title: meetingTitle, date });

        artifact.summary = summaryText;
        await artifact.save();
        console.log(`[Summary] Generated for meeting ${meetingId}`);
      } catch (bgError: unknown) {
        const message = bgError instanceof Error ? bgError.message : String(bgError);
        console.error("[Summary] Background generation failed:", message);
        artifact.summary = "Summary generation failed. Please try again.";
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
export const updateSummary = async (req: Request, res: Response): Promise<void> => {
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
    await artifact.save();

    res.status(200).json({ message: "Minutes updated successfully", artifact });
  } catch (error) {
    console.error("[Summary] Update Error:", error);
    res.status(500).json({ message: "Failed to update summary." });
  }
};

// Chat with Transcript using NLP
export const askBot = async (req: Request, res: Response): Promise<void> => {
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
