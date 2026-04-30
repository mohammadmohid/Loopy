"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import Pusher from "pusher-js";
import { useAuth } from "@/lib/auth-provider";
import { apiRequest } from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

/** Polling interval in ms – set via env var, 0 or omit to disable */
const POLLING_INTERVAL = parseInt(
    process.env.NEXT_PUBLIC_CHAT_POLLING_INTERVAL || "0",
    10
);

interface ChatContextValue {
    pusher: Pusher | null;
    isConnected: boolean;
    unreadCounts: Record<string, number>;
    totalUnread: number;
    currentChannelId: string | null;
    clearUnread: (channelId: string) => void;
    setCurrentChannelId: (channelId: string | null) => void;
    joinChannel: (channelId: string) => void;
    leaveChannel: (channelId: string) => void;
    emitTyping: (channelId: string) => void;
    emitStopTyping: (channelId: string) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const pusherRef = useRef<Pusher | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);

    // We use refs to avoid binding stale state in socket listeners
    const selectedChannelIdRef = useRef<string | null>(null);
    useEffect(() => {
        selectedChannelIdRef.current = currentChannelId;
    }, [currentChannelId]);

    // ── Hydrate unread counts from server on mount ──
    const fetchUnreadCounts = useCallback(async () => {
        if (!user) return;
        try {
            const data = await apiRequest<{ counts: Record<string, number> }>("/chat/unread", {
                method: "GET",
            });
            if (data?.counts) {
                setUnreadCounts(data.counts);
            }
        } catch (err) {
            // Silently fail — Pusher will still work for real-time updates
            console.warn("[ChatContext] Failed to fetch unread counts:", err);
        }
    }, [user]);

    // Fetch on mount / user change
    useEffect(() => {
        fetchUnreadCounts();
    }, [fetchUnreadCounts]);

    // ── Optional polling (controlled by env var) ──
    useEffect(() => {
        if (!POLLING_INTERVAL || POLLING_INTERVAL <= 0 || !user) return;

        const interval = setInterval(fetchUnreadCounts, POLLING_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchUnreadCounts, user]);

    // ── Pusher connection ──
    useEffect(() => {
        if (!user) return;

        const pusher = new Pusher(
            process.env.NEXT_PUBLIC_PUSHER_KEY || "dummy_key",
            {
                cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
            }
        );

        pusherRef.current = pusher;

        pusher.connection.bind("connected", () => setIsConnected(true));
        pusher.connection.bind("disconnected", () => setIsConnected(false));
        pusher.connection.bind("error", () => setIsConnected(false));

        const userChannel = pusher.subscribe(`user-${user.id}`);
        
        const handleMessageNotification = (data: { channelId: string; message: ChatMessage }) => {
            const currentSelectedId = selectedChannelIdRef.current;
            // Only increment badge if we are NOT actively viewing the channel
            if (data.channelId !== currentSelectedId) {
                setUnreadCounts((prev) => ({
                    ...prev,
                    [data.channelId]: (prev[data.channelId] || 0) + 1,
                }));
            }
        };

        userChannel.bind("message-notification", handleMessageNotification);

        return () => {
            userChannel.unbind("message-notification", handleMessageNotification);
            pusher.unsubscribe(`user-${user.id}`);
            pusher.disconnect();
            pusherRef.current = null;
        };
    }, [user]);

    // ── Clear unread (local + server) ──
    const clearUnread = useCallback((channelId: string) => {
        setUnreadCounts((prev) => {
            if (!prev[channelId]) return prev;
            const updated = { ...prev };
            delete updated[channelId];
            return updated;
        });

        // Persist to server (fire-and-forget)
        apiRequest("/chat/unread/read", {
            method: "POST",
            data: { channelId },
        }).catch(() => {});
    }, []);

    const joinChannel = useCallback((channelId: string) => {
        // Handled by use-chat-socket
    }, []);

    const leaveChannel = useCallback((channelId: string) => {
        // Handled by use-chat-socket
    }, []);

    const emitTyping = useCallback((channelId: string) => {
        // Handled by REST API or custom Pusher events if needed
    }, []);

    const emitStopTyping = useCallback((channelId: string) => {
        // Handled by REST API or custom Pusher events if needed
    }, []);

    const totalUnread = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);

    return (
        <ChatContext.Provider
            value={{
                pusher: pusherRef.current,
                isConnected,
                unreadCounts,
                totalUnread,
                currentChannelId,
                clearUnread,
                setCurrentChannelId,
                joinChannel,
                leaveChannel,
                emitTyping,
                emitStopTyping,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}

export function useChat() {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error("useChat must be used within a ChatProvider");
    }
    return context;
}
