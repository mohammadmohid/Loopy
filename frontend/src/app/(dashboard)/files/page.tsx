"use client";

import { useState, useCallback } from "react";
import { Plus, Upload } from "lucide-react";
import useSWR from "swr";
import { apiRequest } from "@/lib/api";
import { File, Folder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useFileNavigation } from "@/hooks/useFileNavigation";
import { useFilesAPI } from "@/hooks/useFilesAPI";
import { FileBreadcrumb } from "@/components/files/FileBreadcrumb";
import { FolderGrid } from "@/components/files/FolderGrid";
import { FileGrid } from "@/components/files/FileGrid";
import { FileToolbar } from "@/components/files/FileToolbar";
import { FilePreview } from "@/components/files/viewers/FilePreview";
import { CreateFolderModal } from "./_components/create-folder-modal";
import { UploadFileModal } from "./_components/upload-file-modal";


export default function FilesPage() {
  // Navigation state
  const { breadcrumbs, navigateToFolder, goBack, navigateToRoot, navigateToParent } = useFileNavigation();

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // API
  const { listFolders, listFiles } = useFilesAPI();

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1]?.id || null;

  const getMimeFilter = (f: string) => {
    if (f === "pdf") return "application/pdf";
    if (f === "image") return "image/";
    if (f === "docx") return "officedocument.wordprocessingml";
    return "";
  };

  const mimeType = getMimeFilter(filter);

  // Fetch system folders (root level only)
  const { data: systemFolders, mutate: mutateFolders, error: foldersError } = useSWR<Folder[]>(
    currentFolderId === null && filter === "all" ? "/api/files/folders?type=SYSTEM" : null,
    apiRequest
  );

  // Fetch custom folders
  const { data: customFolders, mutate: mutateCustomFolders } = useSWR<Folder[]>(
    searchQuery
      ? `/api/files/folders?search=${encodeURIComponent(searchQuery)}`
      : (currentFolderId === null && filter === "all" ? "/api/files/folders?type=CUSTOM" : (filter === "all" ? `/api/files/folders?parentId=${currentFolderId}` : null)),
    apiRequest
  );

  // Fetch files in current folder or global search
  const { data: files, mutate: mutateFiles, isLoading: filesLoading } = useSWR<File[]>(
    searchQuery 
      ? `/api/files/?search=${encodeURIComponent(searchQuery)}&mimeType=${mimeType}`
      : (currentFolderId ? `/api/files/?folderId=${currentFolderId}&mimeType=${mimeType}` : null),
    apiRequest
  );

  // Fetch files for system folders
  const { data: systemFiles, mutate: mutateSysFiles } = useSWR<File[]>(
    currentFolderId && currentFolderId.startsWith("system-") ? `/api/files/?folderId=${currentFolderId}&mimeType=${mimeType}` : null,
    apiRequest
  );

  const handleFolderClick = useCallback((folder: Folder) => {
    navigateToFolder({ _id: folder._id, name: folder.name });
  }, [navigateToFolder]);

  const handleFileRefresh = useCallback(() => {
    mutateFiles();
    mutateCustomFolders();
    mutateFolders();
  }, [mutateFiles, mutateCustomFolders, mutateFolders]);

  const handleDeleteFile = useCallback(async (file: File) => {
    if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
      try {
        await apiRequest(`/api/files/files/${file._id}`, { method: "DELETE" });
        handleFileRefresh();
      } catch (error) {
        console.error("Failed to delete file:", error);
      }
    }
  }, [handleFileRefresh]);

  const handleDownloadFile = useCallback((file: File) => {
    window.location.href = `/api/files/files/${file._id}/download`;
  }, []);

  const handleEditFile = useCallback((file: File) => {
    // Only .docx files can be edited
    if (file.name.toLowerCase().endsWith(".docx")) {
      window.location.href = `/files/edit/${file._id}`;
    }
  }, []);

  const handlePreviewFile = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  const handleDeleteFolder = useCallback(async (folder: Folder) => {
    if (confirm(`Are you sure you want to delete "${folder.name}"?`)) {
      try {
        await apiRequest(`/api/files/folders/${folder._id}`, { method: "DELETE" });
        handleFileRefresh();
      } catch (error) {
        console.error("Failed to delete folder:", error);
      }
    }
  }, [handleFileRefresh]);

  const isRoot = currentFolderId === null;
  const filesList = isRoot ? [] : (files || []);
  const foldersList = isRoot ? (customFolders || []) : (customFolders || []);
  const sysFilesList = currentFolderId && currentFolderId.startsWith("system-") ? (systemFiles || []) : [];

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA]">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 bg-white border-b border-neutral-100">
        <FileBreadcrumb
          items={breadcrumbs}
          onNavigate={(index) => {
            navigateToParent(index);
          }}
        />

        <FileToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filter={filter}
          onFilterChange={setFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onCreateFolder={() => setIsCreateModalOpen(true)}
          onUploadFile={() => setIsUploadModalOpen(true)}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-10">
        {isRoot ? (
          <>
            {/* System Folders */}
            {systemFolders && systemFolders.length > 0 && (
              <div>
                <div className="flex flex-col mb-6">
                  <h2 className="text-sm font-semibold text-neutral-900 mb-1">System Folders</h2>
                  <p className="text-xs text-neutral-500">Auto-populated from projects and channels</p>
                </div>
                <FolderGrid
                  folders={systemFolders}
                  onOpen={handleFolderClick}
                  onDelete={(folderId) => {
                    const folder = systemFolders?.find(f => f._id === folderId);
                    if (folder) handleDeleteFolder(folder);
                  }}
                />
              </div>
            )}

            {/* Custom Folders */}
            {customFolders && customFolders.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 mb-6">My Folders</h2>
                <FolderGrid
                  folders={customFolders}
                  onOpen={handleFolderClick}
                  onDelete={(folderId) => {
                    const folder = customFolders?.find(f => f._id === folderId);
                    if (folder) handleDeleteFolder(folder);
                  }}
                />
              </div>
            )}

            {/* Empty State */}
            {(!systemFolders || systemFolders.length === 0) &&
              (!customFolders || customFolders.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-neutral-600 mb-4">No folders yet</p>
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Folder
                  </Button>
                </div>
              )}
          </>
        ) : (
          <>
            {/* Sub-folders */}
            {foldersList.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 mb-6">Folders</h2>
                <FolderGrid
                  folders={foldersList}
                  onOpen={handleFolderClick}
                  onDelete={(folderId) => {
                    const folder = foldersList?.find(f => f._id === folderId);
                    if (folder) handleDeleteFolder(folder);
                  }}
                />
              </div>
            )}

            {/* Files */}
            {(filesList.length > 0 || sysFilesList.length > 0) && (
              <div>
                <h2 className="text-sm font-semibold text-neutral-900 mb-6">Files</h2>
                <FileGrid
                  files={filesList.length > 0 ? filesList : sysFilesList}
                  onPreview={handlePreviewFile}
                  onDownload={handleDownloadFile}
                  onDelete={handleDeleteFile}
                  isLoading={filesLoading}
                  viewMode={viewMode}
                />
              </div>
            )}

            {/* Empty State */}
            {filesList.length === 0 && sysFilesList.length === 0 && foldersList.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12">
                <p className="text-neutral-600 mb-4">This folder is empty</p>
                <Button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CreateFolderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleFileRefresh}
        parentId={currentFolderId}
      />

      <UploadFileModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploaded={handleFileRefresh}
        folderId={currentFolderId}
      />

      {/* File Preview Modal */}
      {selectedFile && (
        <FilePreview
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onDownload={handleDownloadFile}
          onEdit={handleEditFile}
        />
      )}
    </div>
  );
}
