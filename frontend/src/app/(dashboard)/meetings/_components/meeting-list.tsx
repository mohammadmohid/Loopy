"use client";

import { FileAudio, FileText, Calendar, Clock, MoreVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Artifact {
  _id: string;
  filename: string;
  transcriptionStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  projectId?: {
      name: string;
  };
}

interface MeetingListProps {
  artifacts: Artifact[];
  isLoading: boolean;
}

export function MeetingList({ artifacts, isLoading }: MeetingListProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50">
        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
          <FileAudio className="w-6 h-6 text-neutral-400" />
        </div>
        <p className="font-medium text-neutral-900">No recordings yet</p>
        <p className="text-sm text-neutral-500">Upload a meeting to get started</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-6 py-3 text-xs font-medium text-neutral-500 uppercase">Name</th>
              <th className="px-6 py-3 text-xs font-medium text-neutral-500 uppercase">Project</th>
              <th className="px-6 py-3 text-xs font-medium text-neutral-500 uppercase">Status</th>
              <th className="px-6 py-3 text-xs font-medium text-neutral-500 uppercase">Date</th>
              <th className="px-6 py-3 text-xs font-medium text-neutral-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {artifacts.map((artifact) => (
              <tr key={artifact._id} className="hover:bg-neutral-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileAudio className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 truncate max-w-[200px]">
                        {artifact.filename}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-neutral-500 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>24:10</span> {/* Mock duration for now */}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                    {artifact.projectId ? (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-neutral-100 text-xs font-medium text-neutral-600">
                            {artifact.projectId.name}
                        </span>
                    ) : (
                        <span className="text-xs text-neutral-400">-</span>
                    )}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={artifact.transcriptionStatus} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-sm text-neutral-600">
                    <Calendar className="w-4 h-4 text-neutral-400" />
                    {new Date(artifact.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-400 hover:text-neutral-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    PENDING: "bg-neutral-100 text-neutral-600",
    PROCESSING: "bg-blue-50 text-blue-600 animate-pulse",
    COMPLETED: "bg-emerald-50 text-emerald-600",
    FAILED: "bg-red-50 text-red-600",
  };

  const labels = {
    PENDING: "Queued",
    PROCESSING: "Transcribing...",
    COMPLETED: "Ready",
    FAILED: "Failed",
  };

  const style = styles[status as keyof typeof styles] || styles.PENDING;
  const label = labels[status as keyof typeof labels] || status;

  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", style)}>
      {label}
    </span>
  );
}