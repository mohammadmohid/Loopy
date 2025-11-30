"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, FileAudio, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string; // Optional now
  onUploadComplete: () => void;
}

interface Project {
  _id: string;
  name: string;
}

type UploadStatus =
  | "idle"
  | "fetching_projects"
  | "signing"
  | "uploading"
  | "registering"
  | "complete"
  | "error";

export function UploadDialog({
  isOpen,
  onClose,
  projectId,
  onUploadComplete,
}: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projectId || ""
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setStatus("idle");
      setErrorMessage("");
      if (!projectId) {
        fetchProjects();
      } else {
        setSelectedProjectId(projectId);
      }
    }
  }, [isOpen, projectId]);

  const fetchProjects = async () => {
    try {
      setStatus("fetching_projects");
      const res = await apiRequest<Project[]>("/projects");
      setProjects(res);
      if (res.length > 0) setSelectedProjectId(res[0]._id);
      setStatus("idle");
    } catch (err) {
      setErrorMessage("Failed to load projects");
      setStatus("error");
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setErrorMessage("");
      if (status === "error") setStatus("idle");
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!selectedProjectId) {
      setErrorMessage("Please select a project.");
      return;
    }

    try {
      // Step 1: Get Presigned URL (using global endpoint)
      setStatus("signing");
      const signResponse = await apiRequest<{ uploadUrl: string; key: string }>(
        `/projects/artifacts/sign`,
        {
          method: "POST",
          data: {
            projectId: selectedProjectId,
            fileName: file.name,
            fileType: file.type,
          },
        }
      );

      // Step 2: Upload directly to R2
      setStatus("uploading");
      const uploadResult = await fetch(signResponse.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResult.ok)
        throw new Error("Failed to upload file to storage.");

      // Step 3: Register Artifact
      setStatus("registering");
      await apiRequest(`/projects/artifacts`, {
        method: "POST",
        data: {
          projectId: selectedProjectId,
          storageKey: signResponse.key,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        },
      });

      setStatus("complete");
      setTimeout(() => {
        onUploadComplete();
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error("Upload failed:", error);
      setStatus("error");
      setErrorMessage(error.message || "Upload failed. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-xl animate-in zoom-in-95">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-neutral-900">
            Upload Recording
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-lg"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {status === "complete" ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-medium text-neutral-900">
                Upload Successful!
              </h3>
              <p className="text-sm text-neutral-500">
                Transcription has started in the background.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Project Selection (only if not pre-selected) */}
            {!projectId && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">
                  Select Project
                </label>
                {status === "fetching_projects" ? (
                  <div className="h-10 w-full bg-neutral-100 animate-pulse rounded-lg" />
                ) : (
                  <select
                    className="w-full p-2 border border-neutral-200 rounded-lg text-sm bg-white"
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                  >
                    <option value="" disabled>
                      Select a project...
                    </option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed border-neutral-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-neutral-50",
                file && "border-primary/50 bg-primary/5"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {file ? (
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <FileAudio className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-medium text-sm text-neutral-900 break-all">
                    {file.name}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5 text-neutral-500" />
                  </div>
                  <p className="font-medium text-sm text-neutral-900">
                    Click to upload
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    MP3, WAV, MP4 (Max 2GB)
                  </p>
                </div>
              )}
            </div>

            {status === "error" && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4" />
                {errorMessage}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={status !== "idle" && status !== "error"}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={
                  !file ||
                  !selectedProjectId ||
                  (status !== "idle" && status !== "error")
                }
                loading={
                  status !== "idle" &&
                  status !== "error" &&
                  status !== "fetching_projects"
                }
              >
                {status === "signing" && "Preparing..."}
                {status === "uploading" && "Uploading..."}
                {status === "registering" && "Finalizing..."}
                {(status === "idle" || status === "error") && "Upload"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
