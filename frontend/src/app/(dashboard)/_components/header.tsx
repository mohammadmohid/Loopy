"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Search, Menu, LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-provider";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get initials for avatar
  const getInitials = () => {
    if (!user?.profile) return "U";
    return `${user.profile.firstName.charAt(0)}${user.profile.lastName.charAt(
      0
    )}`.toUpperCase();
  };

  return (
    <header className="h-16 bg-white border-b border-neutral-200 px-4 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onMenuClick}
          className="p-2 hover:bg-neutral-100 rounded-lg lg:hidden text-neutral-500"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="max-w-md w-full hidden md:block relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search projects, tasks, or people..."
            className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button className="p-2 hover:bg-neutral-100 rounded-full text-neutral-500 relative transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>

        <div className="h-8 w-px bg-neutral-200 mx-1 hidden sm:block" />

        {/* User Menu Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-3 p-1.5 hover:bg-neutral-50 rounded-xl transition-all border border-transparent hover:border-neutral-200"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-white flex items-center justify-center font-medium shadow-sm shadow-primary/20">
              {getInitials()}
            </div>
            <div className="hidden md:block text-left mr-1">
              <p className="text-sm font-medium text-neutral-900 leading-none">
                {user?.profile.firstName} {user?.profile.lastName}
              </p>
              <p className="text-xs text-neutral-500 mt-1 leading-none capitalize">
                {user?.globalRole.toLowerCase()}
              </p>
            </div>
          </button>

          {/* Dropdown Content */}
          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-neutral-100 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
              <div className="px-4 py-3 border-b border-neutral-100 md:hidden">
                <p className="text-sm font-medium text-neutral-900">
                  {user?.profile.firstName} {user?.profile.lastName}
                </p>
                <p className="text-xs text-neutral-500">{user?.email}</p>
              </div>

              <div className="p-1">
                <Link
                  href="/settings/profile"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg transition-colors"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  <UserIcon className="w-4 h-4" />
                  Profile
                </Link>
                <div className="h-px bg-neutral-100 my-1" />
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
