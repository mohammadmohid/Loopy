import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME } from "../config/r2";
import Artifact from "../models/Artifact";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";

// @desc    Get all artifacts for the current user
// @route   GET /api/projects/artifacts
export const getArtifacts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    // Fetch artifacts uploaded by the user, populate project details
    const artifacts = await Artifact.find({ uploader: userId })
      .sort({ createdAt: -1 })
      .populate("projectId", "name");

    res.json(artifacts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate Presigned URL for Upload (PUT)
// @route   POST /api/projects/artifacts/sign OR /api/projects/:id/artifacts/sign
export const signUpload = async (req: AuthRequest, res: Response) => {
  try {
    // Support both param-based (legacy) and body-based projectId
    const projectId = req.params.id || req.body.projectId;
    const { fileName, fileType } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    const fileKey = `projects/${projectId}/artifacts/${Date.now()}_${uuidv4()}_${fileName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType,
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 });

    res.json({ uploadUrl, key: fileKey });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Failed to generate upload URL", error: error.message });
  }
};

// @desc    Register uploaded artifact and trigger transcription
// @route   POST /api/projects/artifacts OR /api/projects/:id/artifacts
export const createArtifact = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.id || req.body.projectId;
    const { storageKey, filename, mimeType, sizeBytes } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    const artifact = await Artifact.create({
      projectId,
      uploader: req.user!.id,
      storageKey,
      filename,
      mimeType,
      sizeBytes,
      transcriptionStatus: "PENDING",
    });

    // --- Trigger Transcription Async ---
    const getCommand = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
    });
    const presignedGetUrl = await getSignedUrl(r2Client, getCommand, {
      expiresIn: 3600,
    });

    try {
      const elevenLabsResponse = await axios.post(
        "https://api.elevenlabs.io/v1/speech-to-text",
        {
          model_id: "scribe_v1",
          cloud_storage_url: presignedGetUrl,
          diarize: true,
          tag_audio_events: true,
          webhook_url: `${process.env.API_GATEWAY_URL}/api/projects/webhooks/transcription`,
        },
        {
          headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY },
        }
      );

      artifact.transcriptionStatus = "PROCESSING";
      artifact.elevenLabsId = elevenLabsResponse.data.transcription_id;
      await artifact.save();
    } catch (apiError) {
      console.error("ElevenLabs Trigger Error:", apiError);
      artifact.transcriptionStatus = "FAILED";
      await artifact.save();
    }

    res.status(201).json(artifact);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ... keep handleTranscriptionWebhook as is ...
export const handleTranscriptionWebhook = async (
  req: Request,
  res: Response
) => {
  try {
    const { transcription_id, status, text, words } = req.body;

    const artifact = await Artifact.findOne({ elevenLabsId: transcription_id });
    if (!artifact) return res.status(404).send("Artifact not found");

    if (status === "completed") {
      artifact.transcriptionStatus = "COMPLETED";
      artifact.transcriptText = text;
      artifact.transcriptJson = { words };
    } else if (status === "failed") {
      artifact.transcriptionStatus = "FAILED";
    }

    await artifact.save();
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Webhook processing failed");
  }
};
