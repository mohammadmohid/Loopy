"use client";

import { apiRequest } from "@/lib/api";
import { File as FileModel, Folder } from "@/lib/types";

export function useFilesAPI() {
  // ─── File Operations ──────────────────────────────────────────────────

  const uploadFile = async (
    file: File | Blob,
    metadata: {
      filename: string;
      mimeType: string;
      sizeBytes: number;
      folderId?: string;
      sourceContext?: any;
    }
  ) => {
    // 1. Get presigned URL for upload
    const { uploadUrl, key, uploadId } = await apiRequest<any>(
      "/projects/artifacts/sign",
      {
        method: "POST",
        data: {
          fileName: metadata.filename,
          fileType: metadata.mimeType,
        },
      }
    );

    // 2. Upload to R2
    await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": metadata.mimeType },
    });

    // 3. Register with File Service
    const response = await apiRequest<{ file: FileModel }>(
      "/api/files/files/upload",
      {
        method: "POST",
        data: {
          filename: metadata.filename,
          mimeType: metadata.mimeType,
          sizeBytes: metadata.sizeBytes,
          r2Key: key,
          folderId: metadata.folderId,
          sourceContext: metadata.sourceContext,
        },
      }
    );

    return response.file;
  };

  const getFile = async (fileId: string) => {
    return apiRequest(`/api/files/files/${fileId}`);
  };

  const getFileVersions = async (fileId: string) => {
    return apiRequest(`/api/files/files/${fileId}/versions`);
  };

  const updateFile = async (fileId: string, data: Partial<FileModel>) => {
    return apiRequest(`/api/files/files/${fileId}`, {
      method: "PATCH",
      data,
    });
  };

  const deleteFile = async (fileId: string) => {
    return apiRequest(`/api/files/files/${fileId}`, {
      method: "DELETE",
    });
  };

  const copyFile = async (fileId: string, targetFolderId: string) => {
    return apiRequest(`/api/files/files/${fileId}/copy`, {
      method: "POST",
      data: { targetFolderId },
    });
  };

  const moveFile = async (fileId: string, targetFolderId: string) => {
    return apiRequest(`/api/files/files/${fileId}/move`, {
      method: "POST",
      data: { targetFolderId },
    });
  };

  const renameFile = async (fileId: string, newName: string) => {
    return apiRequest(`/api/files/files/${fileId}`, {
      method: "PATCH",
      data: { name: newName },
    });
  };

  // ─── Folder Operations ────────────────────────────────────────────────

  const createFolder = async (data: {
    name: string;
    parentFolderId?: string | null;
    type?: string;
  }) => {
    return apiRequest("/api/files/folders", {
      method: "POST",
      data,
    });
  };

  const listFolders = async (query?: string) => {
    return apiRequest(`/api/files/folders${query || ""}`);
  };

  const getFolder = async (folderId: string) => {
    return apiRequest(`/api/files/folders/${folderId}`);
  };

  const getFolderContents = async (folderId: string) => {
    return apiRequest(`/api/files/folders/${folderId}/contents`);
  };

  const getFolderPath = async (folderId: string) => {
    return apiRequest<{ _id: string; name: string }[]>(
      `/api/files/folders/${folderId}/path`
    );
  };

  const updateFolder = async (folderId: string, data: Partial<Folder>) => {
    return apiRequest(`/api/files/folders/${folderId}`, {
      method: "PATCH",
      data,
    });
  };

  const renameFolder = async (folderId: string, newName: string) => {
    return apiRequest(`/api/files/folders/${folderId}`, {
      method: "PATCH",
      data: { name: newName },
    });
  };

  const deleteFolder = async (folderId: string) => {
    return apiRequest(`/api/files/folders/${folderId}`, {
      method: "DELETE",
    });
  };

  // ─── Version Control ──────────────────────────────────────────────────

  const createVersion = async (
    fileId: string,
    file: Blob | ArrayBuffer,
    metadata: {
      filename: string;
      mimeType: string;
      sizeBytes: number;
      changeDescription?: string;
    }
  ) => {
    // 1. Get presigned URL for upload
    const { uploadUrl, key } = await apiRequest<any>(
      "/projects/artifacts/sign",
      {
        method: "POST",
        data: {
          fileName: metadata.filename,
          fileType: metadata.mimeType,
        },
      }
    );

    // 2. Upload to R2
    await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": metadata.mimeType },
    });

    // 3. Register version with File Service
    return apiRequest(`/api/files/files/${fileId}/versions`, {
      method: "POST",
      data: {
        r2Key: key,
        changeDescription: metadata.changeDescription,
      },
    });
  };

  // ─── Search & Listing ─────────────────────────────────────────────────

  const listFiles = async (query?: string) => {
    return apiRequest(`/api/files/${query || ""}`);
  };

  const getRecentFiles = async (limit?: number) => {
    return apiRequest<FileModel[]>(
      `/api/files/files/recent${limit ? `?limit=${limit}` : ""}`
    );
  };

  const searchFiles = async (params: {
    search?: string;
    mimeType?: string;
    uploadedBy?: string;
    folderId?: string;
    sharedWithMe?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set("search", params.search);
    if (params.mimeType) searchParams.set("mimeType", params.mimeType);
    if (params.uploadedBy) searchParams.set("uploadedBy", params.uploadedBy);
    if (params.folderId) searchParams.set("folderId", params.folderId);
    if (params.sharedWithMe) searchParams.set("sharedWithMe", "true");

    const qs = searchParams.toString();
    return apiRequest<{ files: FileModel[]; total: number }>(
      `/api/files/${qs ? `?${qs}` : ""}`
    );
  };

  return {
    // File ops
    uploadFile,
    getFile,
    getFileVersions,
    updateFile,
    deleteFile,
    copyFile,
    moveFile,
    renameFile,
    // Folder ops
    createFolder,
    listFolders,
    getFolder,
    getFolderContents,
    getFolderPath,
    updateFolder,
    renameFolder,
    deleteFolder,
    // Versioning
    createVersion,
    // Search & listing
    listFiles,
    getRecentFiles,
    searchFiles,
  };
}
