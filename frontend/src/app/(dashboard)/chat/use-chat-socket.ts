"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { ChatMessage } from "@/lib/types";

interface UseChatSocketOptions {
    onNewMessage?: (message: ChatMessage) => void;
    onMessageDeleted?: (data: { messageId: string; channelId: string }) => void;
    onMessageEdited?: (message: ChatMessage) => void;
    onReactionUpdated?: (message: ChatMessage) => void;
    onMemberJoined?: (data: { channelId: string; userId: string }) => void;
    onMemberLeft?: (data: { channelId: string; userId: string }) => void;
    onUserTyping?: (data: { channelId: string; userId: string }) => void;
    onUserStopTyping?: (data: { channelId: string; userId: string }) => void;
}

export function useChatSocket(options: UseChatSocketOptions = {}) {
    const socketRef = useRef<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
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

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            setIsConnected(true);
        });

        socket.on("disconnect", (reason) => {
            console.log("Socket disconnected:", reason);
            setIsConnected(false);
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err.message);
            setIsConnected(false);
        });

        // --- Server events ---
        if (options.onNewMessage) {
            socket.on("new-message", options.onNewMessage);
        }
        if (options.onMessageDeleted) {
            socket.on("message-deleted", options.onMessageDeleted);
        }
        if (options.onMessageEdited) {
            socket.on("message-edited", options.onMessageEdited);
        }
        if (options.onReactionUpdated) {
            socket.on("reaction-updated", options.onReactionUpdated);
        }
        if (options.onMemberJoined) {
            socket.on("member-joined", options.onMemberJoined);
        }
        if (options.onMemberLeft) {
            socket.on("member-left", options.onMemberLeft);
        }
        if (options.onUserTyping) {
            socket.on("user-typing", options.onUserTyping);
        }
        if (options.onUserStopTyping) {
            socket.on("user-stop-typing", options.onUserStopTyping);
        }

        return () => {
            socket.removeAllListeners();
            socket.disconnect();
            socketRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    return {
        socket: socketRef.current,
        isConnected,
        joinChannel,
        leaveChannel,
        emitTyping,
        emitStopTyping,
    };
}
