"use client";

import type React from "react";

import { Suspense, useCallback, useState, useEffect } from "react";
import { tinykeys } from "tinykeys";
import { Sidebar } from "./_components/sidebar";
import { Header } from "./_components/header";
import { SearchDialog } from "./_components/search-dialog";
import { useAuth } from "@/lib/auth-provider";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const openSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  useEffect(() => {
    const unsubscribe = tinykeys(window, {
      "$mod+k": (e) => {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      },
      "$mod+b": (e) => {
        e.preventDefault();
        setSidebarCollapsed((prev) => !prev);
      },
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="flex h-dvh bg-neutral-50">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header onMenuClick={toggleSidebar} onOpenSearch={openSearch} />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </Suspense>
  );
}
