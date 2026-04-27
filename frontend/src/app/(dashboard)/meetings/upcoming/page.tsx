"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api";
import { MeetingHistoryList, type Meeting } from "../_components/meeting-history-list";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-provider";

export default function UpcomingMeetingsPage() {
    const { user } = useAuth();
    const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUpcomingMeetings = async () => {
            try {
                setIsLoading(true);
                const allMeetings = await apiRequest<Meeting[]>("/meetings");
                const scheduled = allMeetings.filter(m => m.status === "scheduled");
                setUpcomingMeetings(scheduled);
            } catch (error) {
                console.error("Failed to fetch upcoming meetings:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUpcomingMeetings();
    }, [user?.activeWorkspace, user?.workspaceId]);

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] -mt-6 -mx-6 bg-white overflow-hidden p-6 sm:p-8">
            <div className="max-w-4xl mx-auto w-full">
                <h1 className="text-2xl font-bold text-neutral-900 mb-6">Upcoming Meetings</h1>

                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="mt-4">
                        <MeetingHistoryList meetings={upcomingMeetings} />
                    </div>
                )}
            </div>
        </div>
    );
}
