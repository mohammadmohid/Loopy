"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { Plus, Upload, ChevronLeft, Clock, Folder as FolderIcon } from "lucide-react";
import useSWR from "swr";
import { apiRequest } from "@/lib/api";
import { File, Folder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-provider";
import { useFileNavigation } from "@/hooks/useFileNavigation";
import { useFilesAPI } from "@/hooks/useFilesAPI";
import { FileBreadcrumb } from "@/components/files/FileBreadcrumb";
import { FolderGrid } from "@/components/files/FolderGrid";
import { FileGrid } from "@/components/files/FileGrid";
import { FileToolbar } from "@/components/files/FileToolbar";
import { FilePreview } from "@/components/files/viewers/FilePreview";
import { BackgroundContextMenu } from "@/components/files/FileContextMenu";
import { CreateFolderModal } from "./_components/create-folder-modal";
import { UploadFileModal } from "./_components/upload-file-modal";

import { SystemFolderSection } from "./_components/system-folder-section";
import { FileListTable } from "./_components/file-list-table";
import { RenameDialog } from "./_components/rename-dialog";
import { toast } from "sonner";

function FilesPageContent() {
  // Navigation state
  const {
    currentFolderId,
    breadcrumbs,
    highlightFileId,
    navigateToFolder,
    goBack,
    navigateToRoot,
    navigateToParent,
    setBreadcrumbsFromPath,
    isAtRoot,
  } = useFileNavigation();

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [renameTarget, setRenameTarget] = useState<{
    type: "file" | "folder";
    id: string;
    name: string;
  } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("all");
  const [isSharedTab, setIsSharedTab] = useState(false);

  // API hooks
  const { deleteFile, renameFile, renameFolder, deleteFolder, getFolderPath } =
    useFilesAPI();

  const getMimeFilter = (f: string) => {
    if (f === "pdf") return "application/pdf";
    if (f === "image") return "image/";
    if (f === "docx") return "officedocument.wordprocessingml";
    if (f === "video") return "video/";
    if (f === "audio") return "audio/";
    return "";
  };

  const mimeType = getMimeFilter(filter);

  // ─── Data Fetching ──────────────────────────────────────────────────

  // System folders (root only)
  const {
    data: systemFolders,
    mutate: mutateSystemFolders,
  } = useSWR<Folder[]>(
    isAtRoot && !searchQuery && selectedUserId === "all" ? "/api/files/folders?type=SYSTEM" : null,
    apiRequest
  );

  // Workspace members for filter
  const { data: membersData } = useSWR<{ members: any[] }>("/auth/workspaces/members", apiRequest);
  const members = membersData?.members || [];

  // Custom folders
  const { data: customFoldersRaw, mutate: mutateCustomFolders } = useSWR<
    Folder[]
  >(
    searchQuery
      ? `/api/files/folders?search=${encodeURIComponent(searchQuery)}`
      : isAtRoot
        ? "/api/files/folders?type=CUSTOM"
        : `/api/files/folders?parentId=${currentFolderId}`,
    apiRequest
  );

  const { data: channels } = useSWR<any[]>("/chat/channels", apiRequest);

  const { user } = useAuth(); // We need useAuth to get current user ID

  // Filter customFolders: if it's a channel folder, only show if user is a member
  const customFolders = (customFoldersRaw || [])
    .filter((f) => {
      if (f.sourceEntityType === "CHANNEL" && f.sourceEntityId) {
        if (!channels) return true;
        return channels.some((c) => c._id === f.sourceEntityId);
      }
      return true;
    })
    .map((f) => {
      if (f.sourceEntityType === "CHANNEL" && f.sourceEntityId && channels) {
        const channel = channels.find((c) => c._id === f.sourceEntityId);
        if (channel && channel.type === "direct") {
          const otherMember = channel.members.find(
            (m: any) => m.user._id !== user?.id && m.user.toString() !== user?.id
          );
          if (otherMember?.user?.profile) {
            return {
              ...f,
              name: `${otherMember.user.profile.firstName} ${otherMember.user.profile.lastName}`,
            };
          }
        }
      }
      return f;
    });

  // Files in current view
  const buildFileQuery = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (mimeType) params.set("mimeType", mimeType);
    if (selectedUserId !== "all") params.set("uploadedBy", selectedUserId);

    if (!isAtRoot && currentFolderId) {
      params.set("folderId", currentFolderId);
    }

    // Only fetch files if we're in a subfolder, searching, or filtering
    if (isAtRoot && !searchQuery && filter === "all" && selectedUserId === "all")
      return null;

    const qs = params.toString();
    return `/api/files/${qs ? `?${qs}` : ""}`;
  };

  const {
    data: filesData,
    mutate: mutateFiles,
    isLoading: filesLoading,
  } = useSWR<{ files: File[]; total: number }>(buildFileQuery(), apiRequest);

  // Recent files (root only)
  const { data: recentFiles } = useSWR<File[]>(
    isAtRoot && !searchQuery
      ? `/api/files/files/recent?limit=8${mimeType ? `&mimeType=${encodeURIComponent(mimeType)}` : ""}${selectedUserId !== "all" ? `&uploadedBy=${selectedUserId}` : ""}`
      : null,
    apiRequest
  );

  // Resolve breadcrumbs from URL on mount
  useEffect(() => {
    if (currentFolderId && breadcrumbs.length <= 1) {
      getFolderPath(currentFolderId)
        .then((path) => {
          if (path && path.length > 0) {
            setBreadcrumbsFromPath(path);
          }
        })
        .catch(() => { });
    }
  }, [currentFolderId]);

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    mutateFiles();
    mutateCustomFolders();
    mutateSystemFolders();
  }, [mutateFiles, mutateCustomFolders, mutateSystemFolders]);

  const handleFolderClick = useCallback(
    (folder: Folder) => {
      navigateToFolder({ _id: folder._id, name: folder.name });
    },
    [navigateToFolder]
  );

  const handleDeleteFile = useCallback(
    async (file: File) => {
      if (
        !confirm(
          `Are you sure you want to delete "${file.name}"? This will also remove it from any task or chat attachments.`
        )
      )
        return;

      try {
        await deleteFile(file._id);
        toast.success("File deleted successfully");
        handleRefresh();
      } catch (error: any) {
        toast.error(error.message || "Failed to delete file");
      }
    },
    [deleteFile, handleRefresh]
  );

  const handleDownloadFile = useCallback((file: File) => {
    window.open(`/api/files/files/${file._id}/download`, "_blank");
  }, []);

  const handleEditFile = useCallback((file: File) => {
    if (file.name.toLowerCase().endsWith(".docx")) {
      window.location.href = `/files/edit/${file._id}`;
    }
  }, []);

  const handlePreviewFile = useCallback((file: File) => {
    setSelectedFile(file);
  }, []);

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      const folder = [
        ...(systemFolders || []),
        ...(customFolders || []),
      ].find((f) => f._id === folderId);
      if (!folder) return;

      if (folder.isSystem) {
        toast.error("System folders cannot be deleted");
        return;
      }

      if (
        !confirm(`Are you sure you want to delete "${folder.name}"?`)
      )
        return;

      try {
        await deleteFolder(folderId);
        toast.success("Folder deleted");
        handleRefresh();
      } catch (error: any) {
        toast.error(error.message || "Failed to delete folder");
      }
    },
    [systemFolders, customFolders, deleteFolder, handleRefresh]
  );

  const handleRenameFile = useCallback((file: File) => {
    setRenameTarget({ type: "file", id: file._id, name: file.name });
  }, []);

  const handleRenameFolder = useCallback((folder: Folder) => {
    if (folder.isSystem) {
      toast.error("System folders cannot be renamed");
      return;
    }
    setRenameTarget({ type: "folder", id: folder._id, name: folder.name });
  }, []);

  const handleRenameSubmit = useCallback(
    async (newName: string) => {
      if (!renameTarget) return;
      setIsRenaming(true);
      try {
        if (renameTarget.type === "file") {
          await renameFile(renameTarget.id, newName);
        } else {
          await renameFolder(renameTarget.id, newName);
        }
        toast.success(`${renameTarget.type === "file" ? "File" : "Folder"} renamed`);
        handleRefresh();
        setRenameTarget(null);
      } catch (error: any) {
        toast.error(error.message || "Failed to rename");
      } finally {
        setIsRenaming(false);
      }
    },
    [renameTarget, renameFile, renameFolder, handleRefresh]
  );

  // ─── Derived Data ──────────────────────────────────────────────────

  const files = filesData?.files || [];
  const folders = customFolders || [];
  const currentFolder = breadcrumbs[breadcrumbs.length - 1];
  const isInsideSystemFolder = breadcrumbs.some(b => b.isSystem);

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-[#FAFAFA]">

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-neutral-100">
          <div className="flex items-center gap-3">
            {!isAtRoot && (
              <Button
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="gap-1.5 text-neutral-500 hover:text-neutral-700 font-semibold -ml-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            <FileBreadcrumb
              items={breadcrumbs}
              onNavigate={(index) => navigateToParent(index)}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="gap-2 border-neutral-200 font-semibold rounded-xl h-10 px-5"
              onClick={() => setIsCreateModalOpen(true)}
              disabled={isInsideSystemFolder}
              title={isInsideSystemFolder ? "Cannot create folders inside system folders" : ""}
            >
              <Plus className="w-4 h-4" />
              Create Folder
            </Button>
            <Button
              className="gap-2 bg-[#D12B3D] hover:bg-[#B02433] font-semibold rounded-xl h-10 px-5"
              onClick={() => setIsUploadModalOpen(true)}
              disabled={isInsideSystemFolder}
              title={isInsideSystemFolder ? "Cannot upload files to system folders" : ""}
            >
              <Upload className="w-4 h-4" />
              Upload File
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-8 pt-4">
          <FileToolbar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filter={filter}
            onFilterChange={setFilter}
            selectedUserId={selectedUserId}
            onUserChange={setSelectedUserId}
            members={members}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>

        {/* Content Area */}
        <BackgroundContextMenu
          onNewFolder={!isInsideSystemFolder ? () => setIsCreateModalOpen(true) : undefined}
          onUploadFile={!isInsideSystemFolder ? () => setIsUploadModalOpen(true) : undefined}
        >
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8">
            {isAtRoot && !searchQuery && !isSharedTab ? (
              <>
                {/* System Folders */}
                {systemFolders && systemFolders.length > 0 && (
                  <SystemFolderSection
                    folders={systemFolders}
                    onOpen={handleFolderClick}
                  />
                )}

                {/* User Folders */}
                {folders.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-sm font-bold text-neutral-900 tracking-tight">
                        Folders
                      </h2>
                    </div>
                    <FolderGrid
                      folders={folders}
                      onOpen={handleFolderClick}
                      onDelete={handleDeleteFolder}
                      onRename={(folderId) => {
                        const f = folders.find((x) => x._id === folderId);
                        if (f) handleRenameFolder(f);
                      }}
                    />
                  </div>
                )}

                {/* Recent Files */}
                {recentFiles && recentFiles.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-5">
                      <Clock className="w-4 h-4 text-neutral-400" />
                      <h2 className="text-sm font-bold text-neutral-900 tracking-tight">
                        Recent Files
                      </h2>
                    </div>
                    <FileGrid
                      files={recentFiles}
                      viewMode="grid"
                      onPreview={handlePreviewFile}
                      onDownload={handleDownloadFile}
                      onDelete={handleDeleteFile}
                    />
                  </div>
                )}

                {/* Empty State */}
                {(!systemFolders || systemFolders.length === 0) &&
                  folders.length === 0 &&
                  (!recentFiles || recentFiles.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
                        <FolderIcon className="w-10 h-10 text-neutral-300" />
                      </div>
                      <p className="text-neutral-600 font-semibold mb-2">
                        No files yet
                      </p>
                      <p className="text-neutral-400 text-sm mb-6">
                        Upload files or create folders to get started
                      </p>
                      <div className="flex gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setIsCreateModalOpen(true)}
                          className="gap-2 rounded-xl"
                        >
                          <Plus className="w-4 h-4" />
                          Create Folder
                        </Button>
                        <Button
                          onClick={() => setIsUploadModalOpen(true)}
                          className="gap-2 bg-[#D12B3D] hover:bg-[#B02433] rounded-xl"
                        >
                          <Upload className="w-4 h-4" />
                          Upload File
                        </Button>
                      </div>
                    </div>
                  )}
              </>
            ) : (
              <>
                {/* Sub-folders (when inside a folder) */}
                {folders.length > 0 && !searchQuery && (
                  <div>
                    <h2 className="text-sm font-bold text-neutral-900 tracking-tight mb-5">
                      Folders
                    </h2>
                    <FolderGrid
                      folders={folders}
                      onOpen={handleFolderClick}
                      onDelete={handleDeleteFolder}
                      onRename={(folderId) => {
                        const f = folders.find((x) => x._id === folderId);
                        if (f) handleRenameFolder(f);
                      }}
                    />
                  </div>
                )}

                {/* Files */}
                {viewMode === "list" ? (
                  <FileListTable
                    files={files}
                    showUpdateHistory={!isSharedTab}
                    onPreview={handlePreviewFile}
                    onDownload={handleDownloadFile}
                    onDelete={handleDeleteFile}
                    onRename={handleRenameFile}
                    onEdit={handleEditFile}
                  />
                ) : (
                  <FileGrid
                    files={files}
                    isLoading={filesLoading}
                    viewMode="grid"
                    onPreview={handlePreviewFile}
                    onDownload={handleDownloadFile}
                    onDelete={handleDeleteFile}
                  />
                )}

                {/* Empty inside folder */}
                {files.length === 0 &&
                  folders.length === 0 &&
                  !filesLoading && (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
                        <FolderIcon className="w-8 h-8 text-neutral-300" />
                      </div>
                      <p className="text-neutral-600 font-semibold mb-1">
                        {searchQuery
                          ? "No files match your search"
                          : isSharedTab
                            ? "No files shared with you yet"
                            : "This folder is empty"}
                      </p>
                      <p className="text-neutral-400 text-sm mb-5">
                        {searchQuery
                          ? "Try a different search term"
                          : "Upload files to get started"}
                      </p>
                      {!searchQuery && !isSharedTab && (
                        <Button
                          onClick={() => setIsUploadModalOpen(true)}
                          className="gap-2 bg-[#D12B3D] hover:bg-[#B02433] rounded-xl"
                        >
                          <Upload className="w-4 h-4" />
                          Upload File
                        </Button>
                      )}
                    </div>
                  )}
              </>
            )}
          </div>
        </BackgroundContextMenu>
      </div>

      {/* ─── Modals ────────────────────────────────────────────────────── */}

      <CreateFolderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleRefresh}
        parentId={currentFolderId}
      />

      <UploadFileModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploaded={handleRefresh}
        folderId={currentFolderId}
      />

      {renameTarget && (
        <RenameDialog
          isOpen={!!renameTarget}
          onClose={() => setRenameTarget(null)}
          currentName={renameTarget.name}
          itemType={renameTarget.type}
          onRename={handleRenameSubmit}
          isSubmitting={isRenaming}
        />
      )}

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

export default function FilesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-[#FAFAFA]">
          <div className="animate-pulse text-neutral-400 font-semibold">
            Loading files...
          </div>
        </div>
      }
    >
      <FilesPageContent />
    </Suspense>
  );
}
