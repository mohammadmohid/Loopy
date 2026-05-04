import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import File from "../models/File.js";
import Folder from "../models/Folder.js";
import User, { IUser } from "../models/User.js";

declare global {
  namespace Express {
    interface Request {
      fileContext?: {
        file?: any;
        folder?: any;
        userRole?: string;
      };
    }
  }
}

/**
 * Middleware to check if user has access to a file
 * Validates based on workspace membership, file permissions, and folder inheritance
 */
export const checkFileAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
  requiredAccess: "VIEW" | "EDIT" | "DELETE" = "VIEW"
) => {
  try {
    const userId = req.user?.id;
    const fileId = req.params.fileId || req.body.fileId;
    const workspaceId = req.user?.workspaceId;

    if (!userId || !fileId || !workspaceId) {
      res.status(400).json({ message: "Missing required parameters" });
      return;
    }

    // Get user with workspace role
    const user = await User.findById(userId).select("workspaceRoles");
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    // Get user's role in workspace
    const workspaceRole = user.workspaceRoles?.[workspaceId] || "GUEST";

    // Get file with permissions
    const file = await File.findOne({ _id: fileId, workspaceId });
    if (!file) {
      res.status(404).json({ message: "File not found" });
      return;
    }

    // Check file permissions
    const hasPermission = checkFilePermission(
      file,
      workspaceRole,
      requiredAccess
    );

    if (!hasPermission) {
      res.status(403).json({
        message: `You don't have ${requiredAccess} access to this file`,
      });
      return;
    }

    // Check folder permissions if file is in a folder
    if (file.folderId) {
      const folder = await Folder.findById(file.folderId);
      if (folder) {
        const hasFolderAccess = checkFolderPermission(
          folder,
          workspaceRole,
          "VIEW"
        );

        if (!hasFolderAccess) {
          res.status(403).json({
            message: "You don't have access to the parent folder",
          });
          return;
        }
      }
    }

    // Attach file context to request
    req.fileContext = {
      file,
      userRole: workspaceRole,
    };

    next();
  } catch (error: any) {
    res.status(500).json({
      message: "Error checking file access",
      error: error.message,
    });
  }
};

/**
 * Middleware to check if user has access to a folder
 */
export const checkFolderAccess = async (
  req: Request,
  res: Response,
  next: NextFunction,
  requiredAccess: "VIEW" | "EDIT" | "DELETE" = "VIEW"
) => {
  try {
    const userId = req.user?.id;
    const folderId = req.params.folderId || req.body.folderId;
    const workspaceId = req.user?.workspaceId;

    if (!userId || !folderId || !workspaceId) {
      res.status(400).json({ message: "Missing required parameters" });
      return;
    }

    // Get user with workspace role
    const user = await User.findById(userId).select("workspaceRoles");
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    // Get user's role in workspace
    const workspaceRole = user.workspaceRoles?.[workspaceId] || "GUEST";

    // Get folder
    const folder = await Folder.findOne({ _id: folderId, workspaceId });
    if (!folder) {
      res.status(404).json({ message: "Folder not found" });
      return;
    }

    // Check folder permissions
    const hasPermission = checkFolderPermission(
      folder,
      workspaceRole,
      requiredAccess
    );

    if (!hasPermission) {
      res.status(403).json({
        message: `You don't have ${requiredAccess} access to this folder`,
      });
      return;
    }

    req.fileContext = {
      folder,
      userRole: workspaceRole,
    };

    next();
  } catch (error: any) {
    res.status(500).json({
      message: "Error checking folder access",
      error: error.message,
    });
  }
};

/**
 * Check if a user with a specific role can access a file with required permission
 */
export const checkFilePermission = (
  file: any,
  userRole: string,
  requiredAccess: "VIEW" | "EDIT" | "DELETE"
): boolean => {
  // File owner always has full access
  if (file.uploadedBy?.toString() === file.uploadedBy?.toString()) {
    return true;
  }

  // System folders bypass permission checks for members
  if (file.sourceContext?.type && ["RECORDING", "CHAT_MESSAGE"].includes(file.sourceContext.type)) {
    if (userRole === "OWNER" || userRole === "MEMBER" || userRole === "PROJECT_MANAGER") {
      return requiredAccess === "VIEW" || requiredAccess === "EDIT";
    }
  }

  // Check explicit file permissions
  const permission = file.permissions?.find(
    (p: any) => p.role === userRole
  );

  if (!permission) {
    return false;
  }

  // Check if user has required access level
  const accessHierarchy = ["VIEW", "EDIT", "DELETE"];
  const userAccessIndex = accessHierarchy.indexOf(permission.access);
  const requiredAccessIndex = accessHierarchy.indexOf(requiredAccess);

  return userAccessIndex >= requiredAccessIndex;
};

/**
 * Check if a user with a specific role can access a folder with required permission
 */
export const checkFolderPermission = (
  folder: any,
  userRole: string,
  requiredAccess: "VIEW" | "EDIT" | "DELETE"
): boolean => {
  // System folders
  if (folder.isSystem) {
    // Only OWNER can edit/delete system folders
    if (requiredAccess === "EDIT" || requiredAccess === "DELETE") {
      return userRole === "OWNER";
    }
    // Members and guests can view system folders
    return userRole === "OWNER" || userRole === "MEMBER" || userRole === "PROJECT_MANAGER";
  }

  // Custom folders - check permissions
  const permission = folder.permissions?.find(
    (p: any) => p.role === userRole
  );

  if (!permission && requiredAccess === "VIEW") {
    return false;
  }

  if (!permission) {
    return false;
  }

  const accessHierarchy = ["VIEW", "EDIT", "DELETE"];
  const userAccessIndex = accessHierarchy.indexOf(permission.access);
  const requiredAccessIndex = accessHierarchy.indexOf(requiredAccess);

  return userAccessIndex >= requiredAccessIndex;
};

/**
 * Prevent deletion of system folders
 */
export const preventSystemFolderDeletion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const folderId = req.params.folderId || req.body.folderId;
    const workspaceId = req.user?.workspaceId;

    if (!folderId || !workspaceId) {
      res.status(400).json({ message: "Missing required parameters" });
      return;
    }

    const folder = await Folder.findOne({ _id: folderId, workspaceId });
    if (!folder) {
      res.status(404).json({ message: "Folder not found" });
      return;
    }

    if (folder.isSystem) {
      res.status(403).json({
        message: "System folders cannot be deleted",
      });
      return;
    }

    next();
  } catch (error: any) {
    res.status(500).json({
      message: "Error checking folder deletion",
      error: error.message,
    });
  }
};
