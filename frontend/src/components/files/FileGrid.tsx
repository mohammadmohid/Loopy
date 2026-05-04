"use client";

import { File as FileIcon, FileText, Image as ImageIcon, Music, Video, Download, Trash2, Code2, FileJson } from "lucide-react";
import { File } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBytes, getMimeTypeIcon, isImageFile } from "@/lib/utils";

interface FileGridProps {
  files: File[];
  isLoading?: boolean;
  viewMode?: "grid" | "list";
  onPreview?: (file: File) => void;
  onDownload?: (file: File) => void;
  onDelete?: (file: File) => void;
}

function renderIcon(iconType: string, color?: string) {
  const className = `w-8 h-8 ${color || "text-neutral-400"}`;
  
  switch (iconType) {
    case "image":
      return <ImageIcon className={className} />;
    case "pdf":
      return <FileText className={className} />;
    case "document":
      return <FileText className={className} />;
    case "audio":
      return <Music className={className} />;
    case "video":
      return <Video className={className} />;
    case "json":
      return <FileJson className={className} />;
    case "code":
      return <Code2 className={className} />;
    default:
      return <FileIcon className={className} />;
  }
}

export function FileGrid({ files, isLoading, viewMode = "grid", onPreview, onDownload, onDelete }: FileGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="h-32 bg-neutral-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FileIcon className="w-12 h-12 text-neutral-300 mb-3" />
        <p className="text-neutral-500 font-medium">No files yet</p>
        <p className="text-sm text-neutral-400">Upload or create files to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {files.map((file) => {
        const { icon, color } = getMimeTypeIcon(file.mimeType);
        
        return (
          <div
            key={file._id}
            className="group bg-white border border-neutral-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* File Preview Area */}
            <div className="relative h-32 bg-neutral-50 flex items-center justify-center">
              {isImageFile(file.mimeType) ? (
                <img
                  src={`/api/files/files/${file._id}/download`}
                  alt={file.name}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => onPreview?.(file)}
                />
              ) : (
                <div className="flex items-center justify-center text-neutral-400">
                  {renderIcon(icon, color)}
                </div>
              )}
              
              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                {onPreview && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="bg-white/90 hover:bg-white text-neutral-900"
                    onClick={() => onPreview(file)}
                  >
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                )}
                {onDownload && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="bg-white/90 hover:bg-white text-neutral-900"
                    onClick={() => onDownload(file)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* File Info */}
            <div className="p-3 border-t border-neutral-100">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatBytes(file.sizeBytes)}
                  </p>
                </div>
                
                {onDelete && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-neutral-400 hover:text-neutral-600"
                      >
                        <span className="text-lg">⋮</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onDownload && (
                        <DropdownMenuItem onClick={() => onDownload(file)}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => onDelete(file)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
