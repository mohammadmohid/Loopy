"use client";

import { Search } from "lucide-react";

export function SearchBar(onOpenSearch?: () => void) {
  return (
    <div className="flex-1 max-w-xl">
      <button
        onClick={onOpenSearch}
        className="w-full relative flex items-center px-3 py-2 bg-neutral-100 border border-neutral-200 rounded-xl text-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      >
        <Search className="w-4 h-4 text-neutral-400 mr-2 shrink-0" />
        <span className="text-neutral-400 flex-1 text-left">
          Search by title or keyword
        </span>
        <div className="flex items-center gap-1 text-xs text-neutral-400 ml-2">
          <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 text-neutral-500 rounded text-xs">
            Ctrl
          </kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 text-neutral-500 rounded text-xs">
            K
          </kbd>
        </div>
      </button>
    </div>
  );
}
