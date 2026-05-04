"use client";

import { 
  FileText, 
  FileVideo, 
  Image as ImageIcon, 
  FileCode, 
  MoreVertical,
  ArrowUpDown
} from "lucide-react";
import { Artifact } from "@/lib/types";
import { format } from "date-fns";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface ArtifactListProps {
  artifacts: Artifact[];
  folderContext?: string;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (mimeType.startsWith("video/")) return <FileVideo className="w-5 h-5 text-red-500" />;
  if (mimeType.includes("javascript") || mimeType.includes("json")) return <FileCode className="w-5 h-5 text-yellow-500" />;
  return <FileText className="w-5 h-5 text-blue-400" />;
};

export function ArtifactList({ artifacts, folderContext }: ArtifactListProps) {
  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-neutral-200">
        <FileText className="w-12 h-12 text-neutral-200 mb-4" />
        <p className="text-neutral-500 font-medium">No files found in this folder</p>
      </div>
    );
  }

  const isMeetingFolder = folderContext === "Meetings";

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden">
      <Table>
        <TableHeader className="bg-neutral-50/50">
          <TableRow className="hover:bg-transparent border-neutral-100">
            <TableHead className="w-[400px]">
              <div className="flex items-center gap-2 text-neutral-500 font-semibold">
                Name <ArrowUpDown className="w-3 h-3" />
              </div>
            </TableHead>
            {!isMeetingFolder && (
              <TableHead>
                <div className="flex items-center gap-2 text-neutral-500 font-semibold">
                  Update History
                </div>
              </TableHead>
            )}
            <TableHead>
              <div className="flex items-center gap-2 text-neutral-500 font-semibold">
                Shared by
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2 text-neutral-500 font-semibold">
                Share Date
              </div>
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {artifacts.map((artifact) => (
            <TableRow key={artifact._id} className="hover:bg-neutral-50/50 border-neutral-100">
              <TableCell className="py-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-neutral-50">
                    {getFileIcon(artifact.mimeType)}
                  </div>
                  <span className="font-semibold text-neutral-900 truncate">
                    {artifact.originalFilename}
                  </span>
                </div>
              </TableCell>
              {!isMeetingFolder && (
                <TableCell>
                  <span className="text-sm text-neutral-500">
                    {artifact.summary ? `fix: ${artifact.summary.slice(0, 30)}...` : "initial upload"}
                  </span>
                </TableCell>
              )}
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-[10px] bg-neutral-200">
                      {artifact.uploadedBy.profile.firstName[0]}
                      {artifact.uploadedBy.profile.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-neutral-600 font-medium">
                    {artifact.uploadedBy.profile.firstName} {artifact.uploadedBy.profile.lastName}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm text-neutral-500">
                  {format(new Date(artifact.createdAt), "dd/MM/yyyy")}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                      <MoreVertical className="w-4 h-4 text-neutral-400" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-xl">
                    <DropdownMenuItem className="text-sm font-medium">Download</DropdownMenuItem>
                    <DropdownMenuItem className="text-sm font-medium">Rename</DropdownMenuItem>
                    <DropdownMenuItem className="text-sm font-medium text-red-600">Delete</DropdownMenuItem>
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
