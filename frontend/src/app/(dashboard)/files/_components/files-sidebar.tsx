"use client";

import { cn } from "@/lib/utils";
import { Hash, Users } from "lucide-react";

export type FileViewTab = "all" | "shared";

interface FilesSidebarProps {
  activeTab: FileViewTab;
  onTabChange: (tab: FileViewTab) => void;
}

export function FilesSidebar({ activeTab, onTabChange }: FilesSidebarProps) {
  const tabs = [
    { id: "all" as const, label: "All", icon: Hash },
    { id: "shared" as const, label: "Shared With Me", icon: Users },
  ];

  return (
    <aside className="w-64 bg-[#f8f9fa] border-r border-[#eaecf0] flex flex-col pt-6 px-4">
      <nav className="space-y-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive ? "text-[#cc2233] bg-[#fbeaec]" : "text-neutral-600 hover:bg-neutral-100"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn(
                  "w-4 h-4 flex-shrink-0",
                  isActive ? "text-[#D12B3D]" : "text-neutral-400"
                )} />
                {tab.label}
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
