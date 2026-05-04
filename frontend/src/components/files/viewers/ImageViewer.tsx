"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { File } from "@/lib/types";

interface ImageViewerProps {
  file: File;
  onClose: () => void;
  onDownload?: (file: File) => void;
}

export function ImageViewer({ file, onClose, onDownload }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);

  const handleZoom = (direction: "in" | "out") => {
    setZoom((prev) => {
      const newZoom = direction === "in" ? prev + 0.2 : Math.max(0.5, prev - 0.2);
      return Math.min(newZoom, 3);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="relative w-full h-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-neutral-900 text-white">
          <h3 className="font-medium truncate">{file.name}</h3>
          <div className="flex items-center gap-2">
            {onDownload && (
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={() => onDownload(file)}
              >
                <Download className="w-5 h-5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center overflow-auto bg-neutral-950 p-4">
          <img
            src={`/api/files/files/${file._id}/download`}
            alt={file.name}
            style={{
              transform: `scale(${zoom})`,
              transition: "transform 0.2s",
            }}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 p-4 bg-neutral-900 text-white">
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => handleZoom("out")}
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="w-5 h-5" />
          </Button>
          <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => handleZoom("in")}
            disabled={zoom >= 3}
          >
            <ZoomIn className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
