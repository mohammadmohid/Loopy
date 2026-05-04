"use client";

import { Folder as FolderIcon, Video, MessageCircle, Briefcase, FileText, User } from "lucide-react";
import { Folder } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FolderCardProps {
  folder: Folder;
  onClick: () => void;
}

const getFolderStyles = (context?: string) => {
  switch (context) {
    case "PROJECTS":
      return {
        icon: Briefcase,
        bg: "bg-[#FEE2E2]",
        color: "text-[#D12B3D]",
        hover: "hover:border-[#D12B3D]/30"
      };
    case "MEETINGS":
      return {
        icon: Video,
        bg: "bg-[#DBEAFE]",
        color: "text-[#2563EB]",
        hover: "hover:border-[#2563EB]/30"
      };
    case "CHAT":
      return {
        icon: MessageCircle,
        bg: "bg-[#DCFCE7]",
        color: "text-[#16A34A]",
        hover: "hover:border-[#16A34A]/30"
      };
    case "OTHER":
    case "USERS":
      return {
        icon: User,
        bg: "bg-[#F3F4F6]",
        color: "text-[#4B5563]",
        hover: "hover:border-neutral-300"
      };
    default:
      return {
        icon: FolderIcon,
        bg: "bg-white",
        color: "text-neutral-600",
        hover: "hover:border-neutral-300 shadow-sm"
      };
  }
};

export function FolderCard({ folder, onClick }: FolderCardProps) {
  const styles = getFolderStyles(folder.systemContext);
  const Icon = styles.icon;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-4 p-4 rounded-2xl border border-transparent cursor-pointer transition-all duration-200",
        styles.bg === "bg-white" ? "bg-white border-neutral-100" : styles.bg,
        styles.hover
      )}
    >
      <div className={cn(
        "p-2.5 rounded-xl transition-transform duration-200 group-hover:scale-110",
        styles.bg === "bg-white" ? "bg-neutral-50" : "bg-white/40"
      )}>
        <Icon className={cn("w-5 h-5", styles.color)} />
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-neutral-900 truncate">
          {folder.name}
        </h3>
        {folder.isSystem && (
          <p className="text-[10px] uppercase tracking-wider font-bold text-neutral-400 mt-0.5">
            System
          </p>
        )}
      </div>
    </div>
  );
}
