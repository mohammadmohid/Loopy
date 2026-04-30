import express from "express";
import { AuthRequest, Artifact, getR2Client } from "@loopy/shared";

type Request = express.Request;
type Response = express.Response;
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

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

    if (!fileName || !fileType) {
      return res.status(400).json({ message: "fileName and fileType are required" });
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileKey = `projects/${projectId}/artifacts/${Date.now()}_${uuidv4()}_${sanitizedFileName}`;

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

// @desc    Register uploaded artifact
// @route   POST /api/projects/artifacts
export const createArtifact = async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.id || req.body.projectId;
    const { storageKey, filename, mimeType, sizeBytes } = req.body;

    if (!projectId) {
      return res.status(400).json({ message: "Project ID is required" });
    }

    if (!storageKey || !filename || !mimeType) {
      return res.status(400).json({ message: "storageKey, filename, and mimeType are required" });
    }

    // Basic validation: ensure storageKey starts with the expected prefix
    if (!storageKey.startsWith(`projects/${projectId}/`)) {
      return res.status(400).json({ message: "Invalid storage key for this project" });
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

    res.status(201).json(artifact);
  } catch (error: any) {
    console.error("Artifact Creation Error:", error);
    res.status(500).json({ message: error.message });
  }
};
