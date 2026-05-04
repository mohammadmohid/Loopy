import { useState, useEffect, useCallback } from "react";
import { X, Download, Clock, Loader2, FileText, AlertCircle, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { File } from "@/lib/types";
import { DocxEditor } from "@eigenpal/docx-js-editor";
import "@eigenpal/docx-js-editor/styles.css";

interface DocxViewerProps {
  file: File;
  onClose: () => void;
  onDownload?: (file: File) => void;
  onEdit?: (file: File) => void;
}

export function DocxViewer({
  file,
  onClose,
  onDownload,
  onEdit,
}: DocxViewerProps) {
  const [documentBuffer, setDocumentBuffer] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const loadDocument = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/files/files/${file._id}/download`);
      if (!response.ok) throw new Error("Failed to fetch document");
      
      const buffer = await response.arrayBuffer();
      setDocumentBuffer(buffer);
    } catch (err: any) {
      console.error("Error loading DOCX:", err);
      setError("Failed to load Word document. Please try downloading it instead.");
    } finally {
      setLoading(false);
    }
  }, [file._id]);

  useEffect(() => {
    loadDocument();
  }, [loadDocument]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="relative w-full h-full max-w-6xl max-h-[95vh] flex flex-col bg-neutral-900 rounded-xl overflow-hidden shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-neutral-900 text-white border-b border-white/5">
          <div className="flex flex-col min-w-0">
            <h3 className="font-medium truncate text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              {file.name}
            </h3>
            <p className="text-[10px] text-white/50 uppercase tracking-wider font-bold">
              Preview Mode • Last modified {new Date(file.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20 h-9 w-9"
              onClick={() => setShowVersionHistory(!showVersionHistory)}
              title="Version history"
            >
              <Clock className="w-5 h-5" />
            </Button>
            {onEdit && (
              <Button
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90 text-white border-none h-9 px-4 rounded-lg font-bold text-xs"
                onClick={() => onEdit(file)}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Edit Full Document
              </Button>
            )}
            {onDownload && (
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 h-9 w-9"
                onClick={() => onDownload(file)}
              >
                <Download className="w-5 h-5" />
              </Button>
            )}
            <div className="w-px h-6 bg-white/10 mx-1" />
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20 h-9 w-9"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden bg-neutral-100 relative">
          {/* Main Viewer */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-20">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-neutral-500 font-bold text-sm tracking-tight">Initializing Native Editor...</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12">
                <div className="p-6 rounded-full bg-red-50 text-red-500 mb-6">
                  <AlertCircle className="w-12 h-12" />
                </div>
                <p className="text-neutral-800 font-bold text-lg mb-2">{error}</p>
                <p className="text-neutral-500 text-sm mb-8 text-center max-w-md">
                  There was a problem rendering the document in the browser. You can still download the file to view it locally.
                </p>
                <Button onClick={() => onDownload?.(file)} variant="default" className="px-8 font-bold">
                  Download File
                </Button>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden bg-[#F0F2F5]">
                {documentBuffer && (
                  <DocxEditor
                    documentBuffer={documentBuffer}
                    showToolbar={false}
                    showRuler={true}
                    mode="viewing"
                  />
                )}
              </div>
            )}
          </div>

          {/* Version History Sidebar */}
          {showVersionHistory && (
            <div className="w-80 border-l border-neutral-200 bg-white overflow-auto flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-neutral-400" />
                  <h4 className="font-bold text-neutral-900 text-sm uppercase tracking-tight">
                    History
                  </h4>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowVersionHistory(false)}>
                  <X className="w-4 h-4 text-neutral-400" />
                </Button>
              </div>
              <div className="p-4 space-y-3">
                <div className="p-4 rounded-xl bg-primary/5 border-2 border-primary/20 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-1">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-primary uppercase tracking-tighter bg-primary/10 px-2 py-0.5 rounded">Current</span>
                    <span className="text-[10px] text-neutral-400 font-mono">v1.2.0</span>
                  </div>
                  <p className="text-sm font-bold text-neutral-900 leading-tight">Latest Version</p>
                  <p className="text-[11px] text-neutral-500 mt-1.5 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-neutral-200 flex-shrink-0" />
                    {new Date(file.updatedAt).toLocaleString()}
                  </p>
                </div>
                
                <div className="text-center py-16 px-6">
                  <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-100">
                    <FileText className="w-6 h-6 text-neutral-200" />
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                    Native versioning is enabled.<br/>Future edits will be tracked here automatically.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


