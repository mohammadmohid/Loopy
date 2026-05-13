"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ChevronLeft,
  Save,
  History,
  Users,
  X,
  Share2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { File } from "@/lib/types";
import { DocxEditor, DocxEditorRef } from "@eigenpal/docx-js-editor";
import "@eigenpal/docx-js-editor/styles.css";
import { apiRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useFilesAPI } from "@/hooks/useFilesAPI";

interface PageProps {
  params: Promise<{ fileId: string }>;
}

export default function DocxEditorPage({ params }: PageProps) {
  const router = useRouter();
  const { fileId } = use(params);

  const [file, setFile] = useState<File | null>(null);
  const [documentBuffer, setDocumentBuffer] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [showHistory, setShowHistory] = useState(false);

  const editorRef = useRef<DocxEditorRef>(null);
  const { createVersion, getFileVersions } = useFilesAPI();

  // Fetch version history
  const { data: versionsData, mutate: mutateVersions } = useSWR<{ versions: any[] }>(
    fileId ? `/api/files/files/${fileId}/versions` : null,
    apiRequest
  );
  const versions = versionsData?.versions || [];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch file metadata (API returns { file })
      const { file: fileRecord } = await apiRequest<{ file: File }>(
        `/api/files/files/${fileId}`
      );
      setFile(fileRecord);

      // Fetch document buffer
      const response = await fetch(`/api/files/files/${fileId}/download`);
      if (!response.ok) throw new Error("Failed to fetch document content");

      const buffer = await response.arrayBuffer();
      setDocumentBuffer(buffer);
    } catch (err: any) {
      console.error("Error loading editor data:", err);
      setError("Failed to initialize document editor. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [fileId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!file || !editorRef.current) return;

    try {
      setSaving(true);
      setSaveStatus("idle");

      // Export updated buffer from editor
      const buffer = await editorRef.current.save();
      if (!buffer) throw new Error("Failed to export document");

      // Save as new version
      await createVersion(fileId, buffer, {
        filename: file.name,
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        sizeBytes: buffer.byteLength,
        changeDescription: "Manual commit from editor"
      });

      mutateVersions();
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      console.error("Save error:", err);
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleRevert = async (versionId: string) => {
    if (!confirm("Are you sure you want to revert to this version? Current unsaved changes will be replaced.")) return;

    try {
      setLoading(true);
      await apiRequest(`/api/files/files/${fileId}/revert`, {
        method: "POST",
        data: { versionId }
      });

      // Reload document data
      await loadData();
      mutateVersions();
      setSaveStatus("success");
    } catch (err) {
      console.error("Revert error:", err);
      setError("Failed to revert to previous version.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-neutral-50">
        <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
        <p className="text-neutral-500 font-bold text-lg animate-pulse tracking-tight">
          Opening Document in Secure Cloud Editor...
        </p>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-neutral-50 p-6 text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Failed to Load Document</h2>
        <p className="text-neutral-500 max-w-md mb-8">{error}</p>
        <Button onClick={() => router.back()} variant="outline" className="px-8">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Premium Editor Header */}
      <header className="h-16 border-b border-neutral-200 flex items-center justify-between px-6 bg-white z-30 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="hover:bg-neutral-100 rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-neutral-900 truncate max-w-[300px]">
                {file.name}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-400 font-medium">Auto-saved to Cloud</span>
                {saveStatus === "success" && (
                  <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> All changes saved
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2 mr-4">
            {[1, 2].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-neutral-200 flex items-center justify-center overflow-hidden">
                <Users className="w-4 h-4 text-neutral-400" />
              </div>
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-white bg-primary text-white text-[10px] font-bold flex items-center justify-center">
              +3
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
            className={cn("gap-2 text-neutral-600 font-semibold", showHistory && "bg-neutral-100 text-primary")}
          >
            <History className="w-4 h-4" />
            History
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-neutral-600 font-semibold"
          >
            <Share2 className="w-4 h-4" />
            Share
          </Button>

          <div className="w-px h-6 bg-neutral-200 mx-1" />

          <Button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "gap-2 font-bold px-6 rounded-full transition-all duration-300",
              saveStatus === "success" ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"
            )}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveStatus === "success" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Commiting..." : saveStatus === "success" ? "Committed" : "Commit Changes"}
          </Button>
        </div>
      </header>

      {/* Editor Surface */}
      <main className="flex-1 flex flex-col bg-neutral-50 overflow-hidden relative">
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 w-full max-w-[1200px] mx-auto shadow-2xl bg-white mt-4 border border-neutral-200 overflow-hidden flex flex-col rounded-t-xl relative">
            {documentBuffer && (
              <DocxEditor
                ref={editorRef}
                documentBuffer={documentBuffer}
                showToolbar={true}
                showRuler={true}
                mode="editing"
              />
            )}
          </div>

          {/* Version History Sidebar */}
          {showHistory && (
            <aside className="w-80 border-l border-neutral-200 bg-white flex flex-col animate-in slide-in-from-right duration-300 z-20">
              <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
                <h2 className="font-bold text-sm text-neutral-900 uppercase tracking-tight">Version History</h2>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHistory(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {versions.map((v: any, i: number) => (
                  <div
                    key={v._id}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer group hover:border-primary/30 hover:shadow-md",
                      i === 0 ? "bg-primary/5 border-primary/20" : "bg-neutral-50 border-neutral-100"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded",
                        i === 0 ? "bg-primary text-white" : "bg-neutral-200 text-neutral-500"
                      )}>
                        {i === 0 ? "Current" : `v${v.versionNumber}`}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-neutral-900 truncate">{v.changeDescription}</p>
                    <div className="flex items-center justify-between mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-neutral-200 flex items-center justify-center text-[8px] font-bold text-neutral-500">
                          {v.author?.name?.[0] || "U"}
                        </div>
                        <span className="text-[11px] text-neutral-500 font-medium">{v.author?.name || "System"}</span>
                      </div>

                      {i > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] font-black uppercase text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevert(v._id);
                          }}
                        >
                          Revert
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {versions.length === 0 && (
                  <div className="text-center py-12 px-6">
                    <History className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
                    <p className="text-xs text-neutral-400 font-medium">No history found yet.</p>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  );
}
