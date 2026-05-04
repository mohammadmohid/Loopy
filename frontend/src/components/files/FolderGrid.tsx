"use client";

import { Folder as FolderIcon, Lock, MoreVertical } from "lucide-react";
import { Folder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PermissionBadge } from "./PermissionBadge";

interface FolderGridProps {
  folders: Folder[];
  isLoading?: boolean;
  onOpen?: (folder: Folder) => void;
  onDelete?: (folderId: string) => void;
  onRename?: (folderId: string, newName: string) => void;
  canEditFolders?: boolean;
}

export function FolderGrid({
  folders,
  isLoading,
  onOpen,
  onDelete,
  onRename,
  canEditFolders = true,
}: FolderGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="h-24 bg-neutral-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-center">
        <div>
          <FolderIcon className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm text-neutral-500">No folders</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {folders.map((folder) => {
        const hasAccess = !folder.isSystem; // For now, system folders have restricted access
        
        return (
          <div
            key={folder._id}
            className={`group relative bg-white border border-neutral-200 rounded-lg p-4 transition-all ${
              hasAccess
                ? "hover:shadow-md hover:border-neutral-300 cursor-pointer"
                : "opacity-60 cursor-not-allowed"
            }`}
            onClick={() => hasAccess && onOpen?.(folder)}
          >
            {/* Folder Icon and Name */}
            <div className="flex flex-col items-start gap-3">
              <div className="relative">
                <FolderIcon className={`w-8 h-8 ${
                  folder.isSystem ? "text-blue-500" : "text-amber-500"
                }`} />
                <PermissionBadge
                  hasAccess={hasAccess}
                  tooltipText={folder.isSystem ? "System folder" : "No access"}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {folder.name}
                </p>
                {folder.isSystem && (
                  <p className="text-xs text-neutral-500">System</p>
                )}
              </div>
            </div>

            {/* Actions */}
            {hasAccess && canEditFolders && (onDelete || onRename) && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-neutral-400 hover:text-neutral-600"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onDelete && !folder.isSystem && (
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(folder._id);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
