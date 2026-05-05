"use client";

import { Search, LayoutGrid, List, Filter, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  selectedUserId: string;
  onUserChange: (userId: string) => void;
  members: any[];
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

const FILTER_LABELS: Record<string, string> = {
  all: "All Files",
  pdf: "PDF",
  image: "Images",
  docx: "Word",
  video: "Videos",
  audio: "Audio",
};

export function FileToolbar({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  selectedUserId,
  onUserChange,
  members = [],
  viewMode,
  onViewModeChange,
}: FileToolbarProps) {
  const selectedUser = members.find(m => m.id === selectedUserId || m._id === selectedUserId);

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Search & Filters */}
      <div className="flex-1 max-w-2xl flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search files and folders..."
            className="pl-9 h-10 bg-white border-neutral-200 rounded-xl"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* User Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 h-10 border-neutral-200 text-neutral-600 rounded-xl min-w-[120px]"
            >
              <Users className="w-4 h-4" />
              <span className="text-sm font-semibold truncate max-w-[100px]">
                {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : "All Users"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl max-h-80 overflow-y-auto">
            <DropdownMenuRadioGroup
              value={selectedUserId}
              onValueChange={onUserChange}
            >
              <DropdownMenuRadioItem value="all">
                All Users
              </DropdownMenuRadioItem>
              {members.map(m => (
                <DropdownMenuRadioItem key={m.id || m._id} value={m.id || m._id}>
                  {m.firstName} {m.lastName}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Type Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 h-10 border-neutral-200 text-neutral-600 rounded-xl"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-semibold">
                {FILTER_LABELS[filter] || "All Files"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <DropdownMenuRadioGroup
              value={filter}
              onValueChange={onFilterChange}
            >
              <DropdownMenuRadioItem value="all">
                All Files
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="pdf">
                PDF Documents
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="image">
                Images
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="docx">
                Word Documents
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="video">
                Videos
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="audio">
                Audio
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
        <Button
          size="icon"
          variant={viewMode === "grid" ? "default" : "ghost"}
          className="h-8 w-8 rounded-lg"
          onClick={() => onViewModeChange("grid")}
          title="Grid view"
        >
          <LayoutGrid className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant={viewMode === "list" ? "default" : "ghost"}
          className="h-8 w-8 rounded-lg"
          onClick={() => onViewModeChange("list")}
          title="List view"
        >
          <List className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
