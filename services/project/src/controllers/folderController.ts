import { Response } from "express";
import {
  AuthRequest,
  Folder,
} from "@loopy/shared";

// @desc    Get all folders for the current workspace
// @route   GET /api/projects/folders
export const getFolders = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.user!;
    const { parentId, isSystem } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace" });
    }

    const query: any = { workspaceId };

    if (parentId !== undefined) {
      query.parentId = parentId === "root" || parentId === "" ? null : parentId;
    }

    if (isSystem !== undefined) {
      query.isSystem = isSystem === "true";
    }

    const folders = await Folder.find(query).sort({ isSystem: -1, name: 1 });

    res.json(folders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get system folders for the workspace
// @route   GET /api/projects/folders/system
export const getSystemFolders = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.user!;

    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace" });
    }

    const systemFolders = await Folder.find({
      workspaceId,
      isSystem: true,
      parentId: null,
    });

    res.json(systemFolders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new user folder
// @route   POST /api/projects/folders
export const createFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId } = req.user!;
    const { name, parentId } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ message: "No active workspace" });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Folder name is required" });
    }

    const folder = await Folder.create({
      workspaceId,
      name: name.trim(),
      parentId: parentId || null,
      isSystem: false,
    });

    res.status(201).json(folder);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "A folder with this name already exists here." });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a folder
// @route   DELETE /api/projects/folders/:id
export const deleteFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { workspaceId } = req.user!;

    const folder = await Folder.findOne({ _id: id, workspaceId });

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    if (folder.isSystem) {
      return res.status(403).json({ message: "System folders cannot be deleted." });
    }

    // TODO: Recursively delete subfolders and artifacts? 
    // For now just delete the folder if empty or leave artifacts orphaned/handled by folder check
    await folder.deleteOne();

    res.json({ message: "Folder deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
