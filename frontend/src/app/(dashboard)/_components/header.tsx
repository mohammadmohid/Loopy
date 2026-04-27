"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  Search,
  Menu,
  LogOut,
  User,
  Video,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth-provider";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";
import { useScreenRecorder } from "@/hooks/useScreenRecorder";
import { ScreenRecordModal } from "@/components/modals/ScreenRecordModal";
import { ScreenRecordingPreviewModal } from "@/components/modals/ScreenRecordingPreviewModal";
import { NotificationSidebar } from "./notification-sidebar";

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
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const pathname = usePathname();

  // Screen Recording State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // Post-Recording Preview State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [recordingFilename, setRecordingFilename] = useState("");

  const recorder = useScreenRecorder({
    onStop: (blobUrl, blob) => {
      // Retrieve the filename set by the modal before recording started
      const filename = sessionStorage.getItem("next_recording_filename") || "Screen-Recording";
      sessionStorage.removeItem("next_recording_filename");

      // Stage data for the Trimming Editor Modal instead of auto-downloading
      setPreviewUrl(blobUrl);
      setPreviewBlob(blob);
      setRecordingFilename(filename);
      setIsPreviewModalOpen(true);
    }
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch scheduled meetings count
  useEffect(() => {
    const fetchUpcomingCount = async () => {
      try {
        const meetings = await apiRequest<any[]>("/meetings");
        const scheduled = meetings.filter((m: any) => m.status === "scheduled");
        setUpcomingCount(scheduled.length);
      } catch (error) {
        console.error("Failed to fetch meetings for header count");
      }
    };
    fetchUpcomingCount();

    // Listen for custom event to refetch when meetings are modified
    window.addEventListener("meetingsUpdated", fetchUpcomingCount);
    return () => window.removeEventListener("meetingsUpdated", fetchUpcomingCount);
  }, [pathname, user?.activeWorkspace, user?.workspaceId]);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const data = await apiRequest<{ notifications: unknown[] }>(
          "/projects/notifications/inbox"
        );
        setNotificationCount(data.notifications?.length ?? 0);
      } catch {
        setNotificationCount(0);
      }
    };
    fetchNotificationCount();
    window.addEventListener("meetingsUpdated", fetchNotificationCount);
    return () =>
      window.removeEventListener("meetingsUpdated", fetchNotificationCount);
  }, [pathname, user?.activeWorkspace, user?.workspaceId]);

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
          className="p-2 hover:bg-neutral-100 rounded-lg text-neutral-500"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo */}
        <Link href="/dashboard/home" className="shrink-0">
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

        {/* Upcoming Meetings Pill */}
        {upcomingCount > 0 && (
          <Link href="/meetings/upcoming" className="hidden sm:block">
            <Button variant="outline" className="h-9 px-3 border border-neutral-200 bg-gradient-to-r from-white to-[#fdfafb] hover:bg-neutral-50 text-neutral-700 font-medium text-sm flex items-center gap-2 rounded-lg shadow-sm">
              <span className="bg-[#cc2233] text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                {upcomingCount}
              </span>
              Upcoming Meeting{upcomingCount !== 1 ? 's' : ''}
            </Button>
          </Link>
        )}

        {/* Capture/Create Button */}
        <div className="hidden sm:flex items-center">
          {recorder.isRecording ? (
            <Button
              className="gap-2 h-9 px-4 bg-transparent border border-red-500 hover:bg-red-50 text-red-600 transition shadow-sm rounded-lg animate-pulse"
              onClick={recorder.stopRecording}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
              Recording ({recorder.recordingTime}) - Stop
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setIsRecordModalOpen(true)}
                className="rounded-r-none gap-2 h-9 px-3 bg-[#cc2233] hover:bg-[#b01d2c] text-white"
              >
                <Video className="w-4 h-4" />
                Capture
              </Button>
              <Button
                className="rounded-l-none border-l border-[#b01d2c] h-9 px-2 bg-[#cc2233] hover:bg-[#b01d2c] text-white rounded-r-md"
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setNotificationsOpen(true)}
          className="relative rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
          )}
        </button>

        <NotificationSidebar
          open={notificationsOpen}
          onOpenChange={(open) => {
            setNotificationsOpen(open);
            if (!open) {
              apiRequest<{ notifications: unknown[] }>(
                "/projects/notifications/inbox"
              )
                .then((d) => setNotificationCount(d.notifications?.length ?? 0))
                .catch(() => setNotificationCount(0));
            }
          }}
        />

        {/* User Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 p-1 hover:bg-neutral-100 rounded-full transition-all"
          >
            {user?.profile?.avatarUrl ? (
              <div className="w-8 h-8 rounded-full overflow-hidden border border-neutral-200">
                <Image
                  src={user.profile.avatarUrl}
                  alt="Profile"
                  fill
                  className="object-cover rounded-full hover:outline-neutral-200 outline-2"
                />
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

      {/* Screen Recording Modal */}
      <ScreenRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onRecordingStart={(started) => {
          if (!started) console.log("Recording cancelled or failed to start");
        }}
        useRecorder={recorder}
      />

      {/* Post-Recording Trimming & Preview Modal */}
      <ScreenRecordingPreviewModal
        isOpen={isPreviewModalOpen}
        videoUrl={previewUrl}
        videoBlob={previewBlob}
        filename={recordingFilename}
        onClose={() => {
          setIsPreviewModalOpen(false);
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
          setPreviewBlob(null);
        }}
      />
    </header>
  );
}
