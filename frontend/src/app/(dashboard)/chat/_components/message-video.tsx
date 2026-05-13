"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import type { Attachment } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MessageVideoProps {
  attachment: Attachment;
  className?: string;
}

export function MessageVideo({ attachment, className }: MessageVideoProps) {
  const [isLoading, setIsLoading] = useState(true);

  const videoUrl = attachment.fileId
    ? `/api/files/files/${attachment.fileId}/download`
    : attachment.url || "#";

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden border border-neutral-200 bg-black min-h-[120px] min-w-[220px] max-w-md my-2",
        className
      )}
    >
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 z-10">
          <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
        </div>
      ) : null}

      <video
        src={videoUrl}
        controls
        playsInline
        preload="metadata"
        className={cn(
          "w-full max-h-80 bg-black",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        onLoadedData={() => setIsLoading(false)}
      />

      <div className="absolute top-3 left-3 pointer-events-none">
        <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
          <Play className="w-3 h-3" />
          Video
        </span>
      </div>

      {attachment.name ? (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <p className="text-[10px] font-bold text-white truncate">{attachment.name}</p>
        </div>
      ) : null}
    </div>
  );
}
