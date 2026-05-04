"use client";

import { File } from "@/lib/types";
import { isImageFile, isPdfFile, isDocxFile } from "@/lib/utils";
import { ImageViewer } from "./ImageViewer";
import { PdfViewer } from "./PdfViewer";
import { DocxViewer } from "./DocxViewer";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface FilePreviewProps {
  file: File;
  onClose: () => void;
  onDownload?: (file: File) => void;
  onEdit?: (file: File) => void;
}

export function FilePreview({
  file,
  onClose,
  onDownload,
  onEdit,
}: FilePreviewProps) {
  // Image preview
  if (isImageFile(file.mimeType)) {
    return <ImageViewer file={file} onClose={onClose} onDownload={onDownload} />;
  }

  // PDF preview
  if (isPdfFile(file.mimeType)) {
    return (
      <PdfViewer file={file} onClose={onClose} onDownload={onDownload} />
    );
  }

  // DOCX preview
  if (isDocxFile(file.mimeType)) {
    return (
      <DocxViewer
        file={file}
        onClose={onClose}
        onDownload={onDownload}
        onEdit={onEdit}
      />
    );
  }

  // Generic file preview
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-md text-center">
        <h3 className="font-semibold text-lg mb-2">{file.name}</h3>
        <p className="text-neutral-600 mb-6">This file type cannot be previewed</p>
        <div className="flex gap-3">
          {onDownload && (
            <Button onClick={() => onDownload(file)} className="gap-2 flex-1">
              <Download className="w-4 h-4" />
              Download
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
