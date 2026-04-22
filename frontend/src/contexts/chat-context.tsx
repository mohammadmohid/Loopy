"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth-provider";
import type { ChatMessage } from "@/lib/types";

interface ChatContextValue {
    socket: Socket | null;
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
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [currentChannelId, setCurrentChannelId] = useState<string | null>(null);
    
    // We use refs to avoid binding stale state in socket listeners
    const selectedChannelIdRef = useRef<string | null>(null);
    useEffect(() => {
        selectedChannelIdRef.current = currentChannelId;
    }, [currentChannelId]);

    useEffect(() => {
        // Only connect if user is logged in
        if (!user) return;

        const socket = io(
            process.env.NEXT_PUBLIC_CHAT_URL || "http://localhost:5004",
            {
                withCredentials: true,
                transports: ["websocket", "polling"],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
            }
        );

        socketRef.current = socket;

        socket.on("connect", () => setIsConnected(true));
        socket.on("disconnect", () => setIsConnected(false));
        socket.on("connect_error", () => setIsConnected(false));

        // Global listeners for unread count
        socket.on("new-message", (message: ChatMessage) => {
            const currentSelectedId = selectedChannelIdRef.current;
            if (message.channelId !== currentSelectedId) {
                setUnreadCounts((prev) => ({
                    ...prev,
                    [message.channelId]: (prev[message.channelId] || 0) + 1,
                }));
            }
        });

        // Add channel unread count fetching on connect
        const fetchUnreadCounts = async () => {
            // Here we could hypothetically fetch the real unread counts from the DB if they existed.
            // For now, since unread count is session-based, we start at 0 or whatever is built up from the socket.
        };
        fetchUnreadCounts()

        return () => {
            socket.removeAllListeners();
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user]);

    const clearUnread = useCallback((channelId: string) => {
        setUnreadCounts((prev) => {
            if (!prev[channelId]) return prev;
            const updated = { ...prev };
            delete updated[channelId];
            return updated;
        });
    }, []);

    const joinChannel = useCallback((channelId: string) => {
        socketRef.current?.emit("join-channel", channelId);
    }, []);

    const leaveChannel = useCallback((channelId: string) => {
        socketRef.current?.emit("leave-channel", channelId);
    }, []);

    const emitTyping = useCallback((channelId: string) => {
        socketRef.current?.emit("typing", channelId);
    }, []);

    const emitStopTyping = useCallback((channelId: string) => {
        socketRef.current?.emit("stop-typing", channelId);
    }, []);

    const totalUnread = Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);

    return (
        <ChatContext.Provider
            value={{
                socket: socketRef.current,
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
