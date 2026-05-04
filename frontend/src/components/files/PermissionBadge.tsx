"use client";

import { Lock } from "lucide-react";

interface PermissionBadgeProps {
  hasAccess: boolean;
  tooltipText?: string;
}

export function PermissionBadge({ hasAccess, tooltipText = "No access to this folder" }: PermissionBadgeProps) {
  if (hasAccess) {
    return null;
  }

  return (
    <div className="group relative">
      <Lock className="w-4 h-4 text-amber-500" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
        <div className="bg-neutral-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
          {tooltipText}
        </div>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
      </div>
    </div>
  );
}
