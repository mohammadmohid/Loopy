"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export function ActiveMeetingBanner() {
    const { user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const [activeMeeting, setActiveMeeting] = useState<any | null>(null);
    const [elapsedTime, setElapsedTime] = useState("00:00");

    useEffect(() => {
        // Hide the banner if we are on the meetings page or live meeting page
        if (pathname === '/meetings' || pathname.startsWith('/meetings/live')) return;

        const fetchActiveMeetings = async () => {
            try {
                const meetings = await apiRequest<any[]>("/meetings");
                const active = meetings.filter((m: any) => m.status === "active");
                if (active.length > 0) {
                    // Use the most recent active meeting
                    setActiveMeeting(active[0]);
                } else {
                    setActiveMeeting(null);
                }
            } catch (error) {
                console.error("Failed to fetch active meetings for banner:", error);
            }
        };

        fetchActiveMeetings();
        const interval = setInterval(fetchActiveMeetings, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [pathname, user?.activeWorkspace, user?.workspaceId]);

    // Timer logic based on meeting creation time
    useEffect(() => {
        if (!activeMeeting) return;

        const updateTimer = () => {
            const start = new Date(activeMeeting.createdAt).getTime();
            // Assume the created time is the start time.
            const now = new Date().getTime();
            const diff = Math.max(0, now - start);

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [activeMeeting]);

    // Do not render if on the meetings page, the live meeting page itself, or if there are no active meetings
    if (pathname === '/meetings' || pathname.startsWith('/meetings/live') || !activeMeeting) {
        return null;
    }

    return (
        <div className="bg-[#cc2233] text-white w-full py-2.5 px-4 flex items-center justify-center text-sm font-medium shadow-sm z-10 shrink-0">
            Meeting in progress: <span className="ml-2 font-bold tracking-wide">{elapsedTime}</span>
            <Button
                variant="ghost"
                onClick={() => router.push('/meetings')}
                className="text-white hover:text-white/80 hover:bg-white/10 font-bold ml-4 p-0 h-auto flex items-center gap-1 transition-colors"
            >
                Join <ChevronRight className="w-4 h-4" />
            </Button>
        </div>
    );
}
