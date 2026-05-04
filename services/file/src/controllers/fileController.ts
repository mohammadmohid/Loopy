import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  File,
  FileVersion,
  Folder,
  getR2Client,
} from "@loopy/shared";
import { GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getOrCreateSystemFolder, getOrCreateSubFolder } from "../services/systemFolderService.js";
import { SystemFolderContext } from "@loopy/shared";

// ─── File Operations ─────────────────────────────────────────────────────

export const uploadFile = async (req: Request, res: Response) => {
  try {
    const { filename, mimeType, sizeBytes, r2Key, folderId, sourceContext, permissions } = req.body;
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;

    if (!workspaceId || !userId || !filename || !r2Key) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    let targetFolderId = folderId;

    // Automatic Categorization based on sourceContext
    if (sourceContext && !targetFolderId) {
      if (sourceContext.type === "TASK") {
        const projectsFolder = await getOrCreateSystemFolder(workspaceId, SystemFolderContext.PROJECTS);
        const tasksFolder = await getOrCreateSubFolder(workspaceId, projectsFolder._id, "Task Attachments");
        targetFolderId = tasksFolder._id;
      } else if (sourceContext.type === "CHAT_MESSAGE") {
        const chatFolder = await getOrCreateSystemFolder(workspaceId, SystemFolderContext.CHAT);
        targetFolderId = chatFolder._id;
      }
    }

    // Create file document
    const file = await File.create({
      workspaceId,
      folderId: targetFolderId || null,
      name: filename,
      mimeType: mimeType || "application/octet-stream",
      sizeBytes: sizeBytes || 0,
      r2Key,
      uploadedBy: userId,
      sourceContext: sourceContext || { type: "CUSTOM" },
      permissions: permissions || [
        { role: "OWNER", access: "DELETE" },
        { role: "MEMBER", access: "VIEW" },
      ],
    });

    // Create first version
    const version = await FileVersion.create({
      artifactId: file._id,
      versionNumber: 1,
      r2Key,
      author: userId,
      changeDescription: "Initial upload",
    });

    // Update file with currentVersionId
    file.currentVersionId = version._id;
    await file.save();

    res.status(201).json({
      message: "File uploaded successfully",
      file,
      version,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
};

export const getFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const workspaceId = req.user?.workspaceId;

    const file = await File.findOne({
      _id: fileId,
      workspaceId,
    }).populate("uploadedBy", "name email avatar");

    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    res.json({ file });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching file", error: error.message });
  }
};

export const downloadFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const workspaceId = req.user?.workspaceId;

    const file = await File.findOne({
      _id: fileId,
      workspaceId,
    });

    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    // Generate presigned URL
    const r2 = getR2Client();
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: file.r2Key,
    });
    const url = await getSignedUrl(r2, command, { expiresIn: 3600 });

    if (req.query.redirect === 'false') {
      res.json({ downloadUrl: url });
    } else {
      res.redirect(url);
    }
  } catch (error: any) {
    res.status(500).json({ message: "Error downloading file", error: error.message });
  }
};

export const updateFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { name, permissions, sourceContext, folderId } = req.body;
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;

    const file = await File.findOne({
      _id: fileId,
      workspaceId,
    });

    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    // Permission check: Only owner can update permissions or metadata
    // Allow internal service calls to bypass if needed, but for now we check owner
    const isOwner = file.uploadedBy.toString() === userId || 
                    (typeof file.uploadedBy === 'object' && (file.uploadedBy as any)._id?.toString() === userId);

    if (!isOwner) {
       // If it's an internal service call (X-Internal-Service), we could bypass
       if (!req.headers['x-internal-service']) {
         res.status(403).json({ message: "Not authorized to update this file" });
         return;
       }
    }

    if (name) file.name = name;
    if (permissions) file.permissions = permissions;
    if (sourceContext) file.sourceContext = sourceContext;
    if (folderId) file.folderId = folderId;

    await file.save();

    res.json({ message: "File updated", file });
  } catch (error: any) {
    console.error("updateFile error:", error);
    res.status(500).json({ message: "Error updating file", error: error.message });
  }
};

export const deleteFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;

    const file = await File.findOne({
      _id: fileId,
      workspaceId,
    });

    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    // Only owner can delete
    if (file.uploadedBy.toString() !== userId) {
      res.status(403).json({ message: "Only file owner can delete" });
      return;
    }

    // Delete from R2
    const r2 = getR2Client();
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: file.r2Key,
    });
    await r2.send(deleteCommand);

    // Delete all versions
    await FileVersion.deleteMany({ artifactId: file._id });

    // Delete file
    await File.deleteOne({ _id: fileId });

    res.json({ message: "File deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting file", error: error.message });
  }
};

export const copyFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { targetFolderId } = req.body;
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;

    const file = await File.findOne({
      _id: fileId,
      workspaceId,
    });

    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    // Copy R2 object
    const r2 = getR2Client();
    const newR2Key = `${file.r2Key}-copy-${Date.now()}`;
    const copyCommand = new CopyObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      CopySource: `${process.env.R2_BUCKET_NAME}/${file.r2Key}`,
      Key: newR2Key,
    });
    await r2.send(copyCommand);

    // Create new file
    const newFile = await File.create({
      workspaceId,
      folderId: targetFolderId || file.folderId,
      name: `${file.name} (Copy)`,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      r2Key: newR2Key,
      uploadedBy: userId,
      sourceContext: file.sourceContext,
      permissions: file.permissions,
    });

    // Create version
    const version = await FileVersion.create({
      artifactId: newFile._id,
      versionNumber: 1,
      r2Key: newR2Key,
      author: userId,
      changeDescription: "Copied from " + file.name,
    });

    newFile.currentVersionId = version._id;
    await newFile.save();

    res.status(201).json({ message: "File copied", file: newFile });
  } catch (error: any) {
    res.status(500).json({ message: "Error copying file", error: error.message });
  }
};

export const moveFile = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { targetFolderId } = req.body;
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;

    const file = await File.findOne({
      _id: fileId,
      workspaceId,
    });

    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    if (file.uploadedBy.toString() !== userId) {
      res.status(403).json({ message: "Only file owner can move" });
      return;
    }

    file.folderId = targetFolderId || null;
    await file.save();

    res.json({ message: "File moved", file });
  } catch (error: any) {
    res.status(500).json({ message: "Error moving file", error: error.message });
  }
};

// ─── File Versions ───────────────────────────────────────────────────────

export const getFileVersions = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const workspaceId = req.user?.workspaceId;

    const file = await File.findOne({
      _id: fileId,
      workspaceId,
    });

    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    const versions = await FileVersion.find({ artifactId: fileId })
      .populate("author", "name email")
      .sort({ versionNumber: -1 });

    res.json({ versions });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching versions", error: error.message });
  }
};

export const createVersion = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { changeDescription, r2Key } = req.body;
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;

    const file = await File.findOne({ _id: fileId, workspaceId });
    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    // Get latest version number
    const latestVersion = await FileVersion.findOne({ artifactId: fileId }).sort({ versionNumber: -1 });
    const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    const newVersion = await FileVersion.create({
      artifactId: fileId,
      versionNumber: newVersionNumber,
      r2Key,
      author: userId,
      changeDescription: changeDescription || `Version ${newVersionNumber}`,
    });

    file.currentVersionId = newVersion._id;
    file.r2Key = r2Key;
    await file.save();

    res.status(201).json({ message: "New version created", version: newVersion });
  } catch (error: any) {
    res.status(500).json({ message: "Error creating version", error: error.message });
  }
};

export const getFileVersion = async (req: Request, res: Response) => {
  try {
    const { fileId, versionId } = req.params;
    const workspaceId = req.user?.workspaceId;

    const file = await File.findOne({
      _id: fileId,
      workspaceId,
    });

    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    const version = await FileVersion.findOne({
      _id: versionId,
      artifactId: fileId,
    }).populate("author", "name email");

    if (!version) {
      res.status(404).json({ message: "Version not found" });
      return;
    }

    res.json({ version });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching version", error: error.message });
  }
};

export const revertToVersion = async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { versionId } = req.body;
    const workspaceId = req.user?.workspaceId;
    const userId = req.user?.id;

    const file = await File.findOne({
      _id: fileId,
      workspaceId,
    });

    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    if (file.uploadedBy.toString() !== userId) {
      res.status(403).json({ message: "Only file owner can revert versions" });
      return;
    }

    const oldVersion = await FileVersion.findOne({
      _id: versionId,
      artifactId: fileId,
    });

    if (!oldVersion) {
      res.status(404).json({ message: "Version not found" });
      return;
    }

    // Get latest version number
    const latestVersion = await FileVersion.findOne({ artifactId: fileId }).sort({ versionNumber: -1 });
    const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    // Create new version with old content
    const r2 = getR2Client();
    const newR2Key = `${file.r2Key}-v${newVersionNumber}`;
    const copyCommand = new CopyObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      CopySource: `${process.env.R2_BUCKET_NAME}/${oldVersion.r2Key}`,
      Key: newR2Key,
    });
    await r2.send(copyCommand);

    const newVersion = await FileVersion.create({
      artifactId: fileId,
      versionNumber: newVersionNumber,
      r2Key: newR2Key,
      author: userId,
      changeDescription: `Reverted to version ${oldVersion.versionNumber}`,
    });

    file.currentVersionId = newVersion._id;
    file.r2Key = newR2Key;
    await file.save();

    res.json({ message: "File reverted to previous version", version: newVersion });
  } catch (error: any) {
    res.status(500).json({ message: "Error reverting file", error: error.message });
  }
};

// ─── Folder Operations ───────────────────────────────────────────────────

export const createFolder = async (req: Request, res: Response) => {
  try {
    const { name, parentId } = req.body;
    const workspaceId = req.user?.workspaceId;

    if (!workspaceId || !name) {
      res.status(400).json({ message: "Missing required fields" });
      return;
    }

    const folder = await Folder.create({
      workspaceId,
      name,
      parentId: parentId || null,
      isSystem: false,
    });

    res.status(201).json({ message: "Folder created", folder });
  } catch (error: any) {
    res.status(500).json({ message: "Error creating folder", error: error.message });
  }
};

export const listFolders = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.user?.workspaceId;
    const { parentId } = req.query;

    const query: any = { workspaceId };
    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: "i" };
    } else if (parentId) {
      query.parentId = parentId;
    }

    const folders = await Folder.find(query).sort({ name: 1 });

    res.json({ folders });
  } catch (error: any) {
    res.status(500).json({ message: "Error listing folders", error: error.message });
  }
};

export const getFolder = async (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;
    const workspaceId = req.user?.workspaceId;

    const folder = await Folder.findOne({
      _id: folderId,
      workspaceId,
    });

    if (!folder) {
      res.status(404).json({ message: "Folder not found" });
      return;
    }

    res.json({ folder });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching folder", error: error.message });
  }
};

export const getFolderContents = async (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;
    const workspaceId = req.user?.workspaceId;

    const folder = await Folder.findOne({
      _id: folderId,
      workspaceId,
    });

    if (!folder) {
      res.status(404).json({ message: "Folder not found" });
      return;
    }

    const files = await File.find({
      workspaceId,
      folderId,
    })
      .populate("uploadedBy", "name email avatar")
      .sort({ createdAt: -1 });

    const subfolders = await Folder.find({
      workspaceId,
      parentId: folderId,
    }).sort({ name: 1 });

    res.json({ files, subfolders });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching folder contents", error: error.message });
  }
};

export const updateFolder = async (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;
    const { name } = req.body;
    const workspaceId = req.user?.workspaceId;

    const folder = await Folder.findOne({
      _id: folderId,
      workspaceId,
    });

    if (!folder) {
      res.status(404).json({ message: "Folder not found" });
      return;
    }

    if (folder.isSystem) {
      res.status(403).json({ message: "Cannot edit system folders" });
      return;
    }

    if (name) folder.name = name;
    await folder.save();

    res.json({ message: "Folder updated", folder });
  } catch (error: any) {
    res.status(500).json({ message: "Error updating folder", error: error.message });
  }
};

export const deleteFolder = async (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;
    const workspaceId = req.user?.workspaceId;

    const folder = await Folder.findOne({
      _id: folderId,
      workspaceId,
    });

    if (!folder) {
      res.status(404).json({ message: "Folder not found" });
      return;
    }

    if (folder.isSystem) {
      res.status(403).json({ message: "System folders cannot be deleted" });
      return;
    }

    // Check if folder is empty
    const fileCount = await File.countDocuments({ folderId });
    const subfolderCount = await Folder.countDocuments({ parentId: folderId });

    if (fileCount > 0 || subfolderCount > 0) {
      res.status(400).json({ message: "Folder is not empty" });
      return;
    }

    await Folder.deleteOne({ _id: folderId });

    res.json({ message: "Folder deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting folder", error: error.message });
  }
};

// ─── List Files ─────────────────────────────────────────────────────────

export const listFiles = async (req: Request, res: Response) => {
  try {
    const workspaceId = req.user?.workspaceId;
    const { folderId, limit = "50", skip = "0" } = req.query;

    const query: any = { workspaceId };
    if (folderId) {
      query.folderId = folderId;
    }

    if (req.query.contextType) {
      query["sourceContext.type"] = req.query.contextType;
    }
    if (req.query.contextId) {
      query["sourceContext.id"] = req.query.contextId;
    }

    if (req.query.mimeType) {
      query.mimeType = { $regex: req.query.mimeType, $options: "i" };
    }

    if (req.query.search) {
      query.name = { $regex: req.query.search, $options: "i" };
    }

    const files = await File.find(query)
      .populate("uploadedBy", "name email avatar")
      .populate("currentVersionId")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip));

    const total = await File.countDocuments(query);

    res.json({ files, total, limit: Number(limit), skip: Number(skip) });
  } catch (error: any) {
    res.status(500).json({ message: "Error listing files", error: error.message });
  }
};
