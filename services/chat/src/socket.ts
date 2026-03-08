import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import Channel from "./models/Channel";

interface AuthenticatedSocket extends Socket {
    userId?: string;
}

export function initializeSocket(httpServer: HttpServer): Server {
    const io = new Server(httpServer, {
        cors: {
            origin: [
                "http://localhost:3000",
                "https://loopy-mu.vercel.app",
                "http://192.168.7.15:3000",
            ],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Auth middleware — validate JWT from handshake
    io.use((socket: AuthenticatedSocket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.cookie
                    ?.split(";")
                    .find((c: string) => c.trim().startsWith("token="))
                    ?.split("=")[1];

            if (!token) {
                return next(new Error("Authentication required"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
            socket.userId = decoded.id;
            next();
        } catch (error) {
            next(new Error("Invalid token"));
        }
    });

    io.on("connection", async (socket: AuthenticatedSocket) => {
        const userId = socket.userId!;
        console.log(`User connected: ${userId} (socket: ${socket.id})`);

        // Join user's personal room for targeted notifications
        socket.join(`user:${userId}`);

        // Auto-join all the user's channel rooms
        try {
            const channels = await Channel.find({
                "members.user": userId,
                isArchived: false,
            }).select("_id");

            channels.forEach((channel) => {
                socket.join(`channel:${channel._id}`);
            });

            console.log(`User ${userId} joined ${channels.length} channel rooms`);
        } catch (error) {
            console.error("Error joining channel rooms:", error);
        }

        // --- Client Events ---

        // Manually join a channel room (e.g., after being added)
        socket.on("join-channel", (channelId: string) => {
            socket.join(`channel:${channelId}`);
        });

        // Leave a channel room
        socket.on("leave-channel", (channelId: string) => {
            socket.leave(`channel:${channelId}`);
        });

        // Typing indicator
        socket.on("typing", (channelId: string) => {
            socket.to(`channel:${channelId}`).emit("user-typing", {
                channelId,
                userId,
            });
        });

        socket.on("stop-typing", (channelId: string) => {
            socket.to(`channel:${channelId}`).emit("user-stop-typing", {
                channelId,
                userId,
            });
        });

        // Disconnect
        socket.on("disconnect", (reason) => {
            console.log(`User disconnected: ${userId} (reason: ${reason})`);
        });
    });

    return io;
}
