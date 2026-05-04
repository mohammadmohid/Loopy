import { Router } from "express";
import { protect } from "@loopy/shared";
import * as fileController from "../controllers/fileController.js";

const router: any = Router();

// Middleware to ensure authenticated
router.use(protect);

// File operations
router.post("/files/upload", fileController.uploadFile);
router.get("/files/:fileId", fileController.getFile);
router.get("/files/:fileId/download", fileController.downloadFile);
router.get("/files/:fileId/versions", fileController.getFileVersions);
router.post("/files/:fileId/versions", fileController.createVersion);
router.get("/files/:fileId/versions/:versionId", fileController.getFileVersion);
router.post("/files/:fileId/revert", fileController.revertToVersion);
router.patch("/files/:fileId", fileController.updateFile);
router.delete("/files/:fileId", fileController.deleteFile);
router.post("/files/:fileId/copy", fileController.copyFile);
router.post("/files/:fileId/move", fileController.moveFile);

// Folder operations
router.post("/folders", fileController.createFolder);
router.get("/folders", fileController.listFolders);
router.get("/folders/:folderId", fileController.getFolder);
router.get("/folders/:folderId/contents", fileController.getFolderContents);
router.patch("/folders/:folderId", fileController.updateFolder);
router.delete("/folders/:folderId", fileController.deleteFolder);

// List files in workspace or folder
router.get("/", fileController.listFiles);

export default router;
