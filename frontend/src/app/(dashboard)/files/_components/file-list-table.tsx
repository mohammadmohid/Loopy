"use client";

import {
  FileText,
  FileVideo,
  Image as ImageIcon,
  FileCode,
  MoreVertical,
  ArrowUpDown,
  Download,
  Pencil,
  Trash2,
  Copy,
  FolderInput,
  Eye,
  History,
} from "lucide-react";
import { File } from "@/lib/types";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatBytes, isDocxFile } from "@/lib/utils";

interface FileListTableProps {
  files: File[];
  showUpdateHistory?: boolean;
  onPreview?: (file: File) => void;
  onDownload?: (file: File) => void;
  onDelete?: (file: File) => void;
  onRename?: (file: File) => void;
  onMove?: (file: File) => void;
  onCopy?: (file: File) => void;
  onEdit?: (file: File) => void;
  onViewInDirectory?: (file: File) => void;
  currentUserId?: string;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/"))
    return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (mimeType.startsWith("video/"))
    return <FileVideo className="w-5 h-5 text-red-500" />;
  if (
    mimeType.includes("javascript") ||
    mimeType.includes("json") ||
    mimeType.includes("xml")
  )
    return <FileCode className="w-5 h-5 text-yellow-500" />;
  if (mimeType.includes("wordprocessingml") || mimeType.includes("msword"))
    return <FileText className="w-5 h-5 text-blue-600" />;
  if (mimeType.includes("pdf"))
    return <FileText className="w-5 h-5 text-red-600" />;
  return <FileText className="w-5 h-5 text-blue-400" />;
};

export function FileListTable({
  files,
  showUpdateHistory = true,
  onPreview,
  onDownload,
  onDelete,
  onRename,
  onMove,
  onCopy,
  onEdit,
  onViewInDirectory,
  currentUserId,
}: FileListTableProps) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-neutral-200">
        <FileText className="w-12 h-12 text-neutral-200 mb-4" />
        <p className="text-neutral-500 font-medium">No files found</p>
      </div>
    );
  }

  const getUploaderInitials = (file: File) => {
    const profile = file.uploadedBy?.profile;
    if (profile) {
      return `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`;
    }
    return "??";
  };

  const getUploaderName = (file: File) => {
    const profile = file.uploadedBy?.profile;
    if (profile) {
      return `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
    }
    return "Unknown";
  };

  const canDelete = (file: File) => {
    if (!currentUserId) return true;
    const uploaderId =
      typeof file.uploadedBy === "string"
        ? file.uploadedBy
        : file.uploadedBy?._id;
    return uploaderId === currentUserId;
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <Table>
        <TableHeader className="bg-neutral-50/50">
          <TableRow className="hover:bg-transparent border-neutral-100">
            <TableHead className="w-[400px]">
              <div className="flex items-center gap-2 text-neutral-500 font-semibold text-xs uppercase tracking-wider">
                Name <ArrowUpDown className="w-3 h-3" />
              </div>
            </TableHead>
            {showUpdateHistory && (
              <TableHead>
                <div className="flex items-center gap-2 text-neutral-500 font-semibold text-xs uppercase tracking-wider">
                  Update History
                </div>
              </TableHead>
            )}
            <TableHead>
              <div className="flex items-center gap-2 text-neutral-500 font-semibold text-xs uppercase tracking-wider">
                Shared by
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2 text-neutral-500 font-semibold text-xs uppercase tracking-wider">
                Share Date
              </div>
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow
              key={file._id}
              className="hover:bg-neutral-50/50 border-neutral-100 cursor-pointer group"
              onClick={() => onPreview?.(file)}
            >
              <TableCell className="py-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-neutral-50">
                    {getFileIcon(file.mimeType)}
                  </div>
                  <span className="font-semibold text-neutral-900 truncate text-sm">
                    {file.name}
                  </span>
                </div>
              </TableCell>
              {showUpdateHistory && (
                <TableCell>
                  <span className="text-sm text-neutral-500">
                    {(file as any).currentVersionId?.changeDescription ||
                      "initial upload"}
                  </span>
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-[10px] bg-neutral-200 font-bold">
                      {getUploaderInitials(file)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-neutral-600 font-medium">
                    {getUploaderName(file)}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-neutral-500">
                  {format(new Date(file.createdAt), "dd/MM/yyyy")}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4 text-neutral-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 rounded-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {onPreview && (
                      <DropdownMenuItem
                        className="gap-3 text-sm font-medium"
                        onClick={() => onPreview(file)}
                      >
                        <Eye className="w-4 h-4" /> Preview
                      </DropdownMenuItem>
                    )}
                    {onEdit && isDocxFile(file.mimeType) && (
                      <DropdownMenuItem
                        className="gap-3 text-sm font-medium"
                        onClick={() => onEdit(file)}
                      >
                        <Pencil className="w-4 h-4" /> Edit
                      </DropdownMenuItem>
                    )}
                    {onDownload && (
                      <DropdownMenuItem
                        className="gap-3 text-sm font-medium"
                        onClick={() => onDownload(file)}
                      >
                        <Download className="w-4 h-4" /> Download
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {onRename && canDelete(file) && (
                      <DropdownMenuItem
                        className="gap-3 text-sm font-medium"
                        onClick={() => onRename(file)}
                      >
                        <Pencil className="w-4 h-4" /> Rename
                      </DropdownMenuItem>
                    )}
                    {onMove && canDelete(file) && (
                      <DropdownMenuItem
                        className="gap-3 text-sm font-medium"
                        onClick={() => onMove(file)}
                      >
                        <FolderInput className="w-4 h-4" /> Move to...
                      </DropdownMenuItem>
                    )}
                    {onCopy && (
                      <DropdownMenuItem
                        className="gap-3 text-sm font-medium"
                        onClick={() => onCopy(file)}
                      >
                        <Copy className="w-4 h-4" /> Make a copy
                      </DropdownMenuItem>
                    )}
                    {onViewInDirectory && (
                      <DropdownMenuItem
                        className="gap-3 text-sm font-medium"
                        onClick={() => onViewInDirectory(file)}
                      >
                        <History className="w-4 h-4" /> View in directory
                      </DropdownMenuItem>
                    )}
                    {onDelete && canDelete(file) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-3 text-sm font-medium text-red-600 focus:text-red-600"
                          onClick={() => onDelete(file)}
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
