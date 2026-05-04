"use client";

import { ChevronRight } from "lucide-react";
import { BreadcrumbItem } from "@/hooks/useFileNavigation";

interface FileBreadcrumbProps {
  items: BreadcrumbItem[];
  onNavigate: (index: number) => void;
}

export function FileBreadcrumb({ items, onNavigate }: FileBreadcrumbProps) {
  return (
    <div className="flex items-center gap-1 px-2">
      {items.map((item, index) => (
        <div key={item.id || "root"} className="flex items-center gap-1">
          <button
            onClick={() => onNavigate(index)}
            className={`text-sm font-medium transition-colors ${
              index === items.length - 1
                ? "text-neutral-900 cursor-default"
                : "text-neutral-500 hover:text-neutral-700 cursor-pointer"
            }`}
          >
            {item.name}
          </button>
          {index < items.length - 1 && (
            <ChevronRight className="w-4 h-4 text-neutral-300" />
          )}
        </div>
      ))}
    </div>
  );
}
