"use client";

import { useState } from "react";
import { Maximize2, Loader2 } from "lucide-react";
import { File, Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FilePreview } from "@/components/files/viewers/FilePreview";

interface MessageImageProps {
  file?: File;
  attachment?: Attachment;
  className?: string;
}

export function MessageImage({ file, attachment, className }: MessageImageProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const name = file?.name || attachment?.name || "Image";
  const imageUrl = file
    ? `/api/files/files/${file._id}/download`
    : (attachment?.fileId 
        ? `/api/files/files/${attachment.fileId}/download`
        : (attachment?.url || `/api/files/files/${attachment?.key}/download`)); // Fallback if key is used as ID

  // Create a minimal File-like object for FilePreview if we only have an Attachment
  const previewFile = file || {
    _id: attachment?.fileId || attachment?.key || "",
    name: attachment?.name || "",
    mimeType: attachment?.mimeType || "image/jpeg",
    sizeBytes: attachment?.size || 0,
    updatedAt: new Date().toISOString(),
  } as any as File;

  return (
    <>
      <div
        className={cn(
          "relative group cursor-pointer rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-100 min-h-[100px] min-w-[200px] max-w-sm my-2",
          className
        )}
        onClick={() => setIsPreviewOpen(true)}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-50/50 z-10">
            <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
          </div>
        )}

        <img
          src={imageUrl}
          alt={name}
          className={cn(
            "w-full h-auto object-cover transition-all duration-500 group-hover:scale-105",
            isLoading ? "opacity-0" : "opacity-100"
          )}
          onLoad={() => setIsLoading(false)}
        />

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex gap-2">
            <div className="p-2 rounded-full bg-white/90 text-neutral-900 shadow-lg scale-90 group-hover:scale-100 transition-transform">
              <Maximize2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Info Strip */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-[10px] font-bold text-white truncate">{name}</p>
        </div>
      </div>

      {isPreviewOpen && (
        <FilePreview
          file={previewFile}
          onClose={() => setIsPreviewOpen(false)}
          onDownload={(f) => {
            if (file || attachment?.fileId) {
              window.location.href = `/api/files/files/${f._id}/download`;
            } else if (attachment?.url) {
              window.open(attachment.url, '_blank');
            }
          }}
        />
      )}
    </>
  );
}

