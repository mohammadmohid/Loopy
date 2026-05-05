"use client";

import { Briefcase, Video, MessageCircle, Lock } from "lucide-react";
import { Folder } from "@/lib/types";
import { cn } from "@/lib/utils";

interface SystemFolderSectionProps {
  folders: Folder[];
  onOpen: (folder: Folder) => void;
}

const SYSTEM_STYLES: Record<string, {
  icon: typeof Briefcase;
  bg: string;
  color: string;
  hoverBorder: string;
}> = {
  PROJECTS: {
    icon: Briefcase,
    bg: "bg-[#FEE2E2]",
    color: "text-[#D12B3D]",
    hoverBorder: "hover:border-[#D12B3D]/30",
  },
  MEETINGS: {
    icon: Video,
    bg: "bg-[#DBEAFE]",
    color: "text-[#2563EB]",
    hoverBorder: "hover:border-[#2563EB]/30",
  },
  CHAT: {
    icon: MessageCircle,
    bg: "bg-[#DCFCE7]",
    color: "text-[#16A34A]",
    hoverBorder: "hover:border-[#16A34A]/30",
  },
};

export function SystemFolderSection({ folders, onOpen }: SystemFolderSectionProps) {
  if (!folders || folders.length === 0) return null;

  return (
    <div>
      <div className="flex flex-col mb-5">
        <h2 className="text-sm font-bold text-neutral-900 tracking-tight">
          System Created Folders
        </h2>
        <p className="text-xs text-neutral-400 mt-0.5">
          These folders are view-only and are managed automatically
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {folders.map((folder) => {
          const style = SYSTEM_STYLES[folder.systemContext || ""] || SYSTEM_STYLES.PROJECTS;
          const Icon = style.icon;

          return (
            <button
              key={folder._id}
              onClick={() => onOpen(folder)}
              className={cn(
                "group flex items-center gap-4 p-4 rounded-2xl border border-transparent transition-all duration-200 text-left",
                style.bg,
                style.hoverBorder,
                "hover:shadow-md cursor-pointer"
              )}
            >
              <div className="relative">
                <div className={cn(
                  "p-2.5 rounded-xl bg-white/50 transition-transform duration-200 group-hover:scale-110"
                )}>
                  <Icon className={cn("w-5 h-5", style.color)} />
                </div>
                <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white shadow-sm">
                  <Lock className="w-2.5 h-2.5 text-neutral-400" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-neutral-900 truncate">
                  {folder.name}
                </h3>
                <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 mt-0.5">
                  System
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
