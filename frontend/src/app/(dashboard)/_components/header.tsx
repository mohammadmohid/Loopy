"use client";

import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { Video, Bell, ChevronDown, Search } from "lucide-react";
import Image from "next/image";

interface HeaderProps {
  onOpenSearch: () => void;
}

export function Header({ onOpenSearch }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-neutral-200 px-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Image
          src="/images/logo.png"
          alt="Loopy"
          width={100}
          height={32}
          className="h-8 w-auto"
        />
      </div>

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

      {/* Right section */}
      <div className="flex items-center gap-3">
        {/* Upcoming Meeting */}
        <button className="flex items-center gap-2 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">
          <span className="flex items-center justify-center w-5 h-5 bg-primary text-white text-xs font-semibold rounded-full">
            1
          </span>
          <span className="text-sm font-medium text-neutral-700">
            Upcoming Meeting
          </span>
        </button>

        {/* Capture Button */}
        <div className="flex items-center">
          <Button className="rounded-l-xl rounded-r-none gap-2">
            <Video className="w-4 h-4" />
            Capture
          </Button>
          <Button className="rounded-l-none rounded-r-xl px-2 border-l border-primary/20">
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>

        {/* Notifications */}
        <button className="relative p-2 hover:bg-neutral-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5 text-neutral-600" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
            3
          </span>
        </button>

        {/* User Avatar */}
        <button className="flex items-center gap-2 p-1 hover:bg-neutral-100 rounded-lg transition-colors">
          <div className="w-8 h-8 bg-neutral-200 rounded-full flex items-center justify-center text-sm font-medium text-neutral-600">
            {user?.name?.substring(0, 2).toUpperCase() || "MM"}
          </div>
        </button>
      </div>
    </header>
  );
}
