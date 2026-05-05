"use client";

import { Folder as FolderIcon, Lock, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Folder } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FolderGridProps {
  folders: Folder[];
  isLoading?: boolean;
  onOpen?: (folder: Folder) => void;
  onDelete?: (folderId: string) => void;
  onRename?: (folderId: string) => void;
}

export function FolderGrid({
  folders,
  isLoading,
  onOpen,
  onDelete,
  onRename,
}: FolderGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="h-20 bg-neutral-100 rounded-2xl animate-pulse"
            />
          ))}
      </div>
    );
  }

  if (folders.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {folders.map((folder) => (
        <div
          key={folder._id}
          className="group relative flex items-center gap-4 p-4 bg-white border border-neutral-100 rounded-2xl hover:shadow-md hover:border-neutral-200 cursor-pointer transition-all duration-200"
          onClick={() => onOpen?.(folder)}
        >
          {/* Folder Icon */}
          <div className="relative flex-shrink-0">
            <div className="p-2.5 rounded-xl bg-amber-50">
              <FolderIcon className="w-5 h-5 text-amber-500" />
            </div>
            {folder.isSystem && (
              <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white shadow-sm">
                <Lock className="w-2.5 h-2.5 text-neutral-400" />
              </div>
            )}
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-900 truncate">
              {folder.name}
            </p>
            {folder.isSystem && (
              <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 mt-0.5">
                System
              </p>
            )}
          </div>

          {/* Actions (only for non-system folders) */}
          {!folder.isSystem && (onDelete || onRename) && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-full text-neutral-400 hover:text-neutral-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="rounded-xl w-40"
                  onClick={(e) => e.stopPropagation()}
                >
                  {onRename && (
                    <DropdownMenuItem
                      className="gap-3 text-sm font-medium"
                      onClick={() => onRename(folder._id)}
                    >
                      <Pencil className="w-4 h-4" /> Rename
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="gap-3 text-sm font-medium text-red-600 focus:text-red-600"
                        onClick={() => onDelete(folder._id)}
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
