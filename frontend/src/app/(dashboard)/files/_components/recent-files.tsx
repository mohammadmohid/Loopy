"use client";

import { FileText, FileVideo, Image as ImageIcon, FileCode } from "lucide-react";
import { Artifact } from "@/lib/types";

interface RecentFilesProps {
  files: Artifact[];
}

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return <ImageIcon className="w-6 h-6 text-blue-500" />;
  if (mimeType.startsWith("video/")) return <FileVideo className="w-6 h-6 text-red-500" />;
  if (mimeType.includes("javascript") || mimeType.includes("json")) return <FileCode className="w-6 h-6 text-yellow-500" />;
  return <FileText className="w-6 h-6 text-blue-400" />;
};

export function RecentFiles({ files }: RecentFilesProps) {
  if (files.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="aspect-[4/3] bg-neutral-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {files.map((file) => (
        <div 
          key={file._id} 
          className="group flex flex-col bg-white rounded-2xl border border-neutral-100 overflow-hidden hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
        >
          {/* Preview Placeholder / Thumbnail */}
          <div className="aspect-[4/3] bg-neutral-50 flex items-center justify-center border-b border-neutral-50 group-hover:bg-neutral-100/50 transition-colors">
            <div className="p-4 rounded-2xl bg-white shadow-sm transition-transform duration-300 group-hover:scale-110">
              {getFileIcon(file.mimeType)}
            </div>
          </div>
          
          <div className="p-4">
            <h3 className="text-sm font-semibold text-neutral-900 truncate group-hover:text-primary transition-colors">
              {file.originalFilename}
            </h3>
            <p className="text-[10px] text-neutral-400 mt-1 uppercase tracking-wider font-bold">
              {file.mimeType.split("/")[1] || "file"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
