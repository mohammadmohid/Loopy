"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bell,
  Search,
  Menu,
  LogOut,
  User as UserIcon,
  Plus,
  Video,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-provider";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function Header({
  onMenuClick,
  onOpenSearch, // Add this prop
}: {
  onMenuClick: () => void;
  onOpenSearch: () => void;
}) {
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = () => {
    if (!user?.profile) return "U";
    return `${user.profile.firstName.charAt(0)}${user.profile.lastName.charAt(
      0
    )}`.toUpperCase();
  };

  return (
    <header className="h-16 bg-white border-b border-neutral-200 px-4 flex items-center justify-between sticky top-0 z-40 gap-4">
      {/* Left: Logo & Menu Trigger */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-neutral-100 rounded-lg lg:hidden text-neutral-500"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo */}
        <Link href="/dashboard/home" className="flex-shrink-0">
          <Image
            src="/images/logo.png"
            alt="Loopy"
            width={100}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </Link>
      </div>

      {/* Center: Search Bar */}
      <div className="flex-1 max-w-xl hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full relative flex items-center px-3 py-2 bg-neutral-100 border border-neutral-200 rounded-xl text-sm hover:bg-neutral-50 transition-all text-neutral-400"
        >
          <Search className="w-4 h-4 mr-2 shrink-0" />
          <span className="flex-1 text-left">
            Search by title or keyword...
          </span>
          <div className="flex items-center gap-1 text-xs">
            <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-[10px]">
              Ctrl
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-[10px]">
              K
            </kbd>
          </div>
        </button>
      </div>

      {/* Right: Actions & Profile */}
      <div className="flex items-center gap-3">
        {/* Capture/Create Button */}
        <div className="hidden sm:flex items-center">
          <Button className="rounded-r-none gap-2 h-9 px-3">
            <Video className="w-4 h-4" />
            Capture
          </Button>
          <Button
            variant="outline"
            className="rounded-l-none border-l-0 h-9 px-2 bg-primary/5 hover:bg-primary/10 border-primary text-primary"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>

        <button className="p-2 hover:bg-neutral-100 rounded-full text-neutral-500 relative transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 hover:bg-neutral-100 rounded-full transition-all"
          >
            {user?.profile?.avatarKey ? (
              // In real app, construct full URL using R2 Public domain
              <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-200">
                {/* Placeholder for now until avatar URL logic is fully wired */}
                <div className="w-full h-full bg-neutral-200" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-medium">
                {getInitials()}
              </div>
            )}
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-neutral-100 py-1 animate-in fade-in zoom-in-95 z-50">
              <div className="px-4 py-3 border-b border-neutral-100">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {user?.profile.firstName} {user?.profile.lastName}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  {user?.email}
                </p>
              </div>
              <div className="p-1">
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
