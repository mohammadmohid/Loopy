"use client";

import { useState } from "react";
import {
  Pin,
  CornerDownLeft,
  FolderKanban,
  Video,
  MessageCircle,
  Folder,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const pinnedItems = [
  { label: "Project S...", color: "bg-red-100 text-red-700 border-red-200" },
  {
    label: "Meeting...",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    label: "Channel...",
    color: "bg-green-100 text-green-700 border-green-200",
  },
  { label: "File Name", color: "bg-blue-100 text-blue-700 border-blue-200" },
];

const searchCategories = [
  {
    label: "Meetings",
    icon: Video,
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    label: "Projects",
    icon: FolderKanban,
    color: "bg-green-50 text-green-700 border-green-200",
  },
  {
    label: "Chats",
    icon: MessageCircle,
    color: "bg-red-50 text-red-700 border-red-200",
  },
  {
    label: "Files",
    icon: Folder,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
];

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Search by title or keyword"
      showCloseButton={false}
      className="max-w-md"
    >
      <CommandInput
        placeholder="Search by title or keyword"
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Pinned Section */}
        <CommandGroup>
          <div className="flex items-center gap-2 px-2 py-2">
            <Pin className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-medium text-neutral-500">Pinned</span>
          </div>
          <div className="flex flex-wrap gap-2 px-2 pb-3">
            {pinnedItems.map((item) => (
              <button
                key={item.label}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${item.color} hover:opacity-80 transition-opacity`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </CommandGroup>

        {/* Search In Section */}
        <CommandGroup>
          <div className="px-2 py-2">
            <span className="text-xs font-medium text-neutral-400">
              Search In
            </span>
          </div>
          <div className="px-2 pb-2 space-y-1">
            {searchCategories.map((category) => {
              const Icon = category.icon;
              return (
                <CommandItem
                  key={category.label}
                  className={`rounded-lg border ${category.color} cursor-pointer`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{category.label}</span>
                </CommandItem>
              );
            })}
          </div>
        </CommandGroup>
      </CommandList>

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-neutral-200 bg-neutral-50">
        <div className="flex items-center justify-center w-5 h-5 bg-neutral-200 rounded">
          <CornerDownLeft className="w-3 h-3 text-neutral-600" />
        </div>
        <span className="text-xs text-neutral-600">Select</span>
      </div>
    </CommandDialog>
  );
}
