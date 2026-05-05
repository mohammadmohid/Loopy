"use client";

import React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import {
  Eye,
  Download,
  Pencil,
  Trash2,
  Copy,
  FolderInput,
  FolderPlus,
  Upload,
  History,
} from "lucide-react";
import { File as FileType, Folder } from "@/lib/types";
import { isDocxFile } from "@/lib/utils";

// ─── File Context Menu ──────────────────────────────────────────────────

interface FileContextMenuProps {
  file: FileType;
  children: React.ReactNode;
  canDelete?: boolean;
  onPreview?: (file: FileType) => void;
  onEdit?: (file: FileType) => void;
  onDownload?: (file: FileType) => void;
  onRename?: (file: FileType) => void;
  onMove?: (file: FileType) => void;
  onCopy?: (file: FileType) => void;
  onDelete?: (file: FileType) => void;
  onViewVersionHistory?: (file: FileType) => void;
}

export function FileContextMenu({
  file,
  children,
  canDelete = true,
  onPreview,
  onEdit,
  onDownload,
  onRename,
  onMove,
  onCopy,
  onDelete,
  onViewVersionHistory,
}: FileContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56 rounded-xl shadow-lg border-neutral-200">
        {onPreview && (
          <ContextMenuItem
            className="gap-3 font-medium"
            onClick={() => onPreview(file)}
          >
            <Eye className="w-4 h-4" /> Open / Preview
          </ContextMenuItem>
        )}
        {onEdit && isDocxFile(file.mimeType) && (
          <ContextMenuItem
            className="gap-3 font-medium"
            onClick={() => onEdit(file)}
          >
            <Pencil className="w-4 h-4" /> Edit Document
          </ContextMenuItem>
        )}
        {onDownload && (
          <ContextMenuItem
            className="gap-3 font-medium"
            onClick={() => onDownload(file)}
          >
            <Download className="w-4 h-4" /> Download
            <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        {onRename && canDelete && (
          <ContextMenuItem
            className="gap-3 font-medium"
            onClick={() => onRename(file)}
          >
            <Pencil className="w-4 h-4" /> Rename
            <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>
        )}
        {onMove && canDelete && (
          <ContextMenuItem
            className="gap-3 font-medium"
            onClick={() => onMove(file)}
          >
            <FolderInput className="w-4 h-4" /> Move to...
          </ContextMenuItem>
        )}
        {onCopy && (
          <ContextMenuItem
            className="gap-3 font-medium"
            onClick={() => onCopy(file)}
          >
            <Copy className="w-4 h-4" /> Make a copy
            <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
          </ContextMenuItem>
        )}
        {onViewVersionHistory && isDocxFile(file.mimeType) && (
          <ContextMenuItem
            className="gap-3 font-medium"
            onClick={() => onViewVersionHistory(file)}
          >
            <History className="w-4 h-4" /> Version history
          </ContextMenuItem>
        )}
        {onDelete && canDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="gap-3 font-medium text-red-600 focus:text-red-600"
              onClick={() => onDelete(file)}
            >
              <Trash2 className="w-4 h-4" /> Delete
              <ContextMenuShortcut>Del</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ─── Folder Context Menu ────────────────────────────────────────────────

interface FolderContextMenuProps {
  folder: Folder;
  children: React.ReactNode;
  onOpen?: (folder: Folder) => void;
  onRename?: (folder: Folder) => void;
  onDelete?: (folder: Folder) => void;
}

export function FolderContextMenu({
  folder,
  children,
  onOpen,
  onRename,
  onDelete,
}: FolderContextMenuProps) {
  const isSystem = folder.isSystem;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48 rounded-xl shadow-lg border-neutral-200">
        {onOpen && (
          <ContextMenuItem
            className="gap-3 font-medium"
            onClick={() => onOpen(folder)}
          >
            <Eye className="w-4 h-4" /> Open
          </ContextMenuItem>
        )}
        {!isSystem && onRename && (
          <ContextMenuItem
            className="gap-3 font-medium"
            onClick={() => onRename(folder)}
          >
            <Pencil className="w-4 h-4" /> Rename
            <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>
        )}
        {!isSystem && onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="gap-3 font-medium text-red-600 focus:text-red-600"
              onClick={() => onDelete(folder)}
            >
              <Trash2 className="w-4 h-4" /> Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// ─── Background Context Menu (right-click on empty space) ──────────────

interface BackgroundContextMenuProps {
  children: React.ReactNode;
  onNewFolder?: () => void;
  onUploadFile?: () => void;
}

export function BackgroundContextMenu({
  children,
  onNewFolder,
  onUploadFile,
}: BackgroundContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48 rounded-xl shadow-lg border-neutral-200">
        {onNewFolder && (
          <ContextMenuItem
            className="gap-3 font-medium"
            onClick={onNewFolder}
          >
            <FolderPlus className="w-4 h-4" /> New Folder
          </ContextMenuItem>
        )}
        {onUploadFile && (
          <ContextMenuItem
            className="gap-3 font-medium"
            onClick={onUploadFile}
          >
            <Upload className="w-4 h-4" /> Upload File
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
