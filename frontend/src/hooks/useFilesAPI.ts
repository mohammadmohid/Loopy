"use client";

import { apiRequest } from "@/lib/api";
import { File as FileModel, Folder } from "@/lib/types";

export function useFilesAPI() {
  // File operations
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
    // We'll use the chat sign endpoint for now as it's already configured for R2
    // Or better, let's assume the File Service has a similar one. 
    // Wait, let's check if File Service has one. 
    // Actually, I'll use the Chat one for now since it's already working.
    const { url, key } = await apiRequest<{ url: string; key: string }>(
      "/chat/upload/sign",
      {
        method: "POST",
        data: {
          fileName: metadata.filename,
          fileType: metadata.mimeType,
          fileSize: metadata.sizeBytes,
        },
      }
    );

    // 2. Upload to R2
    await fetch(url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": metadata.mimeType },
    });

    // 3. Register with File Service
    const response = await apiRequest<{ file: FileModel }>("/api/files/files/upload", {
      method: "POST",
      data: {
        filename: metadata.filename,
        mimeType: metadata.mimeType,
        sizeBytes: metadata.sizeBytes,
        r2Key: key,
        folderId: metadata.folderId,
        sourceContext: metadata.sourceContext,
      },
    });

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

  // Folder operations
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

  const updateFolder = async (folderId: string, data: Partial<Folder>) => {
    return apiRequest(`/api/files/folders/${folderId}`, {
      method: "PATCH",
      data,
    });
  };

  const deleteFolder = async (folderId: string) => {
    return apiRequest(`/api/files/folders/${folderId}`, {
      method: "DELETE",
    });
  };

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
    const { url, key } = await apiRequest<{ url: string; key: string }>(
      "/chat/upload/sign",
      {
        method: "POST",
        data: {
          fileName: metadata.filename,
          fileType: metadata.mimeType,
          fileSize: metadata.sizeBytes,
        },
      }
    );

    // 2. Upload to R2
    await fetch(url, {
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

  const listFiles = async (query?: string) => {
    return apiRequest(`/api/files/${query || ""}`);
  };

  return {
    uploadFile,
    createVersion,
    getFile,
    getFileVersions,
    updateFile,
    deleteFile,
    copyFile,
    moveFile,
    createFolder,
    listFolders,
    getFolder,
    getFolderContents,
    updateFolder,
    deleteFolder,
    listFiles,
  };
}
