"use client";

import { Plus, Upload, Search, LayoutGrid, List, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuRadioGroup, 
  DropdownMenuRadioItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface FileToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: string;
  onFilterChange: (filter: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onCreateFolder?: () => void;
  onUploadFile?: () => void;
}

export function FileToolbar({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  viewMode,
  onViewModeChange,
  onCreateFolder,
  onUploadFile,
}: FileToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-white border-b border-neutral-200">
      {/* Search & Filter */}
      <div className="flex-1 max-w-2xl flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            placeholder="Search files..."
            className="pl-9 h-10 bg-neutral-50 border-neutral-200"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 h-10 border-neutral-200 text-neutral-600">
              <Filter className="w-4 h-4" />
              <span>{filter === 'all' ? 'All Files' : filter.toUpperCase()}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuRadioGroup value={filter} onValueChange={onFilterChange}>
              <DropdownMenuRadioItem value="all">All Files</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="pdf">PDF Documents</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="image">Images</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="docx">Word Documents</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-lg">
          <Button
            size="icon"
            variant={viewMode === "grid" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() => onViewModeChange("grid")}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant={viewMode === "list" ? "default" : "ghost"}
            className="h-8 w-8"
            onClick={() => onViewModeChange("list")}
            title="List view"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>

        {/* Create Folder */}
        {onCreateFolder && (
          <Button
            variant="outline"
            className="gap-2 border-neutral-200"
            onClick={onCreateFolder}
          >
            <Plus className="w-4 h-4" />
            <span>New Folder</span>
          </Button>
        )}

        {/* Upload File */}
        {onUploadFile && (
          <Button
            className="gap-2 bg-[#D12B3D] hover:bg-[#B02433]"
            onClick={onUploadFile}
          >
            <Upload className="w-4 h-4" />
            <span>Upload</span>
          </Button>
        )}
      </div>
    </div>
  );
}
