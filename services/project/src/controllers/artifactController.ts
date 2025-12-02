import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Client } from "../config/r2";
import Artifact from "../models/Artifact";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import FormData from "form-data";

// @desc    Get all artifacts for the current user
// @route   GET /api/projects/artifacts
export const getArtifacts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const artifacts = await Artifact.find({ uploader: userId })
      .sort({ createdAt: -1 })
      .populate("projectId", "name");

    res.json(artifacts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single artifact by ID (For Viewer)
// @route   GET /api/projects/artifacts/:id
export const getArtifactById = async (req: AuthRequest, res: Response) => {
  try {
    const artifact = await Artifact.findById(req.params.id).populate(
      "projectId",
      "name"
    );

    if (!artifact) {
      return res.status(404).json({ message: "Meeting recording not found" });
    }

    res.json(artifact);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate Presigned URL for Upload (PUT)
// @route   POST /api/projects/artifacts/sign
export const signUpload = async (req: AuthRequest, res: Response) => {
  try {
    const r2Client = getR2Client();
    const projectId = req.params.id || req.body.projectId;
    const { fileName, fileType } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    const fileKey = `projects/${projectId}/artifacts/${Date.now()}_${uuidv4()}_${fileName}`;

    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
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

// @desc    Register uploaded artifact and trigger transcription (Streaming Proxy)
// @route   POST /api/projects/artifacts
export const createArtifact = async (req: AuthRequest, res: Response) => {
  try {
    const r2Client = getR2Client();
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

    // --- Trigger Transcription via Stream Proxy ---
    // 1. Get the file stream from R2
    const getCommand = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: storageKey,
    });

    try {
      const r2Response = await r2Client.send(getCommand);

      if (!r2Response.Body) {
        throw new Error("Empty body received from storage");
      }

      // 2. Prepare FormData
      const form = new FormData();
      form.append("model_id", "scribe_v1");
      // Append the R2 stream as 'file'.
      // Important: Provide filename/contentType options so axios knows how to handle the stream
      form.append("file", r2Response.Body as any, {
        filename: filename,
        contentType: mimeType,
      });
      form.append("diarize", "true");
      form.append("tag_audio_events", "true");
      form.append("timestamps_granularity", "word");

      // Verify Webhook URL
      if (!process.env.API_GATEWAY_URL) {
        console.warn(
          "WARNING: API_GATEWAY_URL is missing. Webhooks will not work."
        );
      }
      const webhookUrl = `${process.env.API_GATEWAY_URL}/api/projects/webhooks/transcription`;
      form.append("webhook_url", webhookUrl);

      console.log(`[ElevenLabs] Triggering transcription for ${filename}...`);

      // 3. Send to ElevenLabs
      const elevenLabsResponse = await axios.post(
        "https://api.elevenlabs.io/v1/speech-to-text",
        form,
        {
          headers: {
            "xi-api-key": process.env.ELEVENLABS_API_KEY,
            ...form.getHeaders(),
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );

      console.log(
        "[ElevenLabs] Success. Job ID:",
        elevenLabsResponse.data.transcription_id
      );

      artifact.transcriptionStatus = "PROCESSING";
      artifact.elevenLabsId = elevenLabsResponse.data.transcription_id;
      await artifact.save();
    } catch (apiError: any) {
      console.error(
        "ElevenLabs Trigger Error:",
        apiError.response?.data || apiError.message
      );

      // Log validation details if available
      if (apiError.response?.data?.detail) {
        console.error(
          "Validation Detail:",
          JSON.stringify(apiError.response.data.detail, null, 2)
        );
      }

      artifact.transcriptionStatus = "FAILED";
      await artifact.save();
    }

    res.status(201).json(artifact);
  } catch (error: any) {
    console.error("Artifact Creation Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Webhook Handler
export const handleTranscriptionWebhook = async (
  req: Request,
  res: Response
) => {
  try {
    console.log("[Webhook] Received transcription update");
    const { transcription_id, status, text, words } = req.body;

    const artifact = await Artifact.findOne({ elevenLabsId: transcription_id });
    if (!artifact) {
      console.error("[Webhook] Artifact not found for ID:", transcription_id);
      return res.status(404).send("Artifact not found");
    }

    if (status === "completed") {
      artifact.transcriptionStatus = "COMPLETED";
      artifact.transcriptText = text;
      artifact.transcriptJson = { words }; // Save rich data
      console.log(`[Webhook] Transcription completed for ${artifact.filename}`);
    } else if (status === "failed") {
      artifact.transcriptionStatus = "FAILED";
      console.log(`[Webhook] Transcription failed for ${artifact.filename}`);
    }

    await artifact.save();
    res.status(200).send("OK");
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(500).send("Webhook processing failed");
  }
};
