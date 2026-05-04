import { useState, useCallback } from "react";
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { File } from "@/lib/types";
import { Document, Page, pdfjs } from "react-pdf";

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  file: File;
  onClose: () => void;
  onDownload?: (file: File) => void;
}

export function PdfViewer({ file, onClose, onDownload }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1.0);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const handleNextPage = () => {
    if (numPages && currentPage < numPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleZoom = (direction: "in" | "out") => {
    setScale((prev) => {
      const newScale = direction === "in" ? prev + 0.2 : Math.max(0.5, prev - 0.2);
      return Math.min(newScale, 2.0);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="relative w-full h-full max-w-5xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-neutral-900 text-white rounded-t-xl">
          <div className="flex flex-col min-w-0">
            <h3 className="font-medium truncate text-sm">{file.name}</h3>
            {numPages && (
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold">
                {currentPage} of {numPages} pages
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white/10 rounded-lg p-1 mr-4">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => handleZoom("out")}
                disabled={scale <= 0.5}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs w-12 text-center font-mono">
                {Math.round(scale * 100)}%
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => handleZoom("in")}
                disabled={scale >= 2.0}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>

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

        {/* PDF Container */}
        <div className="flex-1 flex items-start justify-center overflow-auto bg-neutral-950 p-6">
          <div className="relative shadow-2xl">
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/50 z-10 rounded-lg">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                <p className="text-white/60 text-sm animate-pulse">Loading Document...</p>
              </div>
            )}
            <Document
              file={`/api/files/files/${file._id}/download`}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={null}
              className="flex flex-col items-center"
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="rounded-sm shadow-xl"
              />
            </Document>
          </div>
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between p-4 bg-neutral-900 text-white rounded-b-xl border-t border-white/5">
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10 gap-2 px-4"
            onClick={handlePrevPage}
            disabled={currentPage === 1 || loading}
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </Button>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full text-xs font-medium">
            <span className="text-white">{currentPage}</span>
            <span className="text-white/30">/</span>
            <span className="text-white/60">{numPages || "--"}</span>
          </div>

          <Button
            variant="ghost"
            className="text-white hover:bg-white/10 gap-2 px-4"
            onClick={handleNextPage}
            disabled={numPages === null || currentPage === numPages || loading}
          >
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

