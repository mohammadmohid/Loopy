import { Request, Response } from "express";
import {
  AuthRequest,
  Artifact,
  ArtifactType,
  createPresignedUploadUrl,
  finalizeArtifactUpload,
  initializeUploadTracker,
} from "@loopy/shared";
import { v4 as uuidv4 } from "uuid";

// @desc    Get all artifacts for the current workspace/folder
// @route   GET /api/projects/artifacts
export const getArtifacts = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.user!;
    const { folderId, projectId, artifactType } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace" });
    }

    const query: any = { workspaceId };

    if (folderId) {
      query.folderId = folderId;
    }

    if (projectId) {
      query.projectId = projectId;
    }

    if (artifactType) {
      query.artifactType = artifactType;
    } else if (!folderId && !projectId) {
      // Default to project documents if no filter is provided (legacy behavior)
      query.artifactType = ArtifactType.PROJECT_DOCUMENT;
    }

    const artifacts = await Artifact.find(query)
      .sort({ createdAt: -1 })
      .populate("projectId", "name")
      .populate("uploader", "profile.firstName profile.lastName email")
      .populate("uploadedBy", "profile.firstName profile.lastName email");

    res.json(artifacts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get 10 most recent artifacts in the workspace
// @route   GET /api/projects/artifacts/recent
export const getRecentArtifacts = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.user!;

    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace" });
    }

    const artifacts = await Artifact.find({ workspaceId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("projectId", "name")
      .populate("uploader", "profile.firstName profile.lastName");

    res.json(artifacts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single artifact by ID (For Viewer)
// @route   GET /api/projects/artifacts/:id
export const getArtifactById = async (req: AuthRequest, res: Response) => {
  try {
    const artifact = await Artifact.findOne({
      _id: req.params.id,
      artifactType: ArtifactType.PROJECT_DOCUMENT,
    }).populate(
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
    const projectId = req.params.id || req.body.projectId;
    const { workspaceId } = req.user!;
    const { fileName, fileType } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ message: "Workspace ID is required" });
    }

    if (!fileName || !fileType) {
      return res.status(400).json({ message: "fileName and fileType are required" });
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    
    // Determine file key prefix
    const prefix = projectId 
      ? `projects/${projectId}/artifacts` 
      : `workspaces/${workspaceId}/artifacts`;
    
    const fileKey = `${prefix}/${Date.now()}_${uuidv4()}_${sanitizedFileName}`;

    const uploadId = uuidv4();
    const { uploadUrl } = await createPresignedUploadUrl({
      key: fileKey,
      contentType: fileType,
      category: "project-document",
    });
    await initializeUploadTracker(uploadId, 1, "UPLOADING");

    res.json({ uploadUrl, key: fileKey, uploadId });
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
    const { storageKey, filename, mimeType, sizeBytes, uploadId } = req.body;

    if (!storageKey || !filename || !mimeType) {
      return res.status(400).json({ message: "storageKey, filename, and mimeType are required" });
    }
    // Basic validation: ensure storageKey starts with the expected prefix
    const expectedPrefix = projectId 
      ? `projects/${projectId}/` 
      : `workspaces/${req.user!.workspaceId}/`;

    if (!storageKey.startsWith(expectedPrefix)) {
      return res.status(400).json({ message: "Invalid storage key for this context" });
    }

    const artifact = await finalizeArtifactUpload({
      workspaceId: req.user!.workspaceId,
      folderId: req.body.folderId,
      projectId,
      uploadedBy: req.user!.id,
      filename,
      mimeType,
      sizeBytes,
      r2Key: storageKey,
      expectedPrefix,
      uploadId,
    });

    res.status(201).json(artifact);
  } catch (error: any) {
    console.error("Artifact Creation Error:", error);
    res.status(500).json({ message: error.message });
  }
};
