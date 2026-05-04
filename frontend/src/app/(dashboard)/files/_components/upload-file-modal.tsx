"use client";

import { useState, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { toast } from "sonner";
import { Upload, X, FileText, CheckCircle2, Loader2 } from "lucide-react";

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
  folderId: string | null;
}

export function UploadFileModal({ isOpen, onClose, onUploaded, folderId }: UploadFileModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(10);
    try {
      // 1. Sign upload
      const { uploadUrl, key, uploadId } = await apiRequest<any>("/projects/artifacts/sign", {
        method: "POST",
        data: {
          fileName: file.name,
          fileType: file.type,
        }
      });

      setUploadProgress(40);

      // 2. Upload to R2 (using PUT)
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload to storage");

      setUploadProgress(80);

      // 3. Finalize upload in backend
      await apiRequest("/projects/artifacts", {
        method: "POST",
        data: {
          storageKey: key,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          uploadId,
          folderId,
        }
      });

      setUploadProgress(100);
      toast.success("File uploaded successfully");
      onUploaded();
      onClose();
      setFile(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Upload File</DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-neutral-200 rounded-3xl bg-neutral-50 hover:bg-neutral-100/50 hover:border-primary/30 transition-all cursor-pointer group"
            >
              <div className="p-4 rounded-2xl bg-white shadow-sm mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-neutral-900">Click to upload or drag and drop</p>
              <p className="text-xs text-neutral-500 mt-1">Maximum file size 50MB</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="p-4 border border-neutral-100 rounded-2xl bg-white shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-neutral-50 text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                {!isUploading && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full"
                    onClick={() => setFile(null)}
                  >
                    <X className="w-4 h-4 text-neutral-400" />
                  </Button>
                )}
              </div>

              {isUploading && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="rounded-xl h-12 px-6"
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            className="rounded-xl h-12 px-8 bg-[#D12B3D] hover:bg-[#B02433] min-w-[120px]"
            disabled={!file || isUploading}
            onClick={handleUpload}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading
              </>
            ) : (
              "Upload File"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
