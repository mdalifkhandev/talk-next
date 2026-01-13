import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { parse } from "node:url";
import mongoose from "mongoose";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Map to track socketId -> userId
const onlineUsers = new Map<string, string>();

// Connect to MongoDB for user status updates
const MONGODB_URI = process.env.MONGODB_URI || '';

async function connectDB() {
    if (mongoose.connection.readyState >= 1) return;

    if (!MONGODB_URI || (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://'))) {
        console.warn('⚠️  MONGODB_URI is not set or invalid in .env file');
        console.warn('⚠️  User status persistence will not work. Please add a valid MongoDB connection string.');
        return;
    }

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
    }
}

app.prepare().then(async () => {
    await connectDB();

    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url!, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log("Client connected", socket.id);

        socket.on("join_user", async (userId) => {
            socket.join(userId);
            onlineUsers.set(socket.id, userId);
            console.log(`User ${userId} online`);

            // Update DB
            try {
                const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
                await User.findByIdAndUpdate(userId, {
                    isOnline: true,
                    socketId: socket.id,
                    lastSeen: new Date()
                });
            } catch (e) {
                console.error('Error updating user status:', e);
            }

            io.emit("user_status_change", { userId, isOnline: true });
        });

        socket.on("send_message", (message) => {
            const receiverId = message.receiver;
            io.to(receiverId).emit("receive_message", message);

            // Create notification if receiver is offline or not in chat
            io.to(receiverId).emit("new_notification", {
                type: 'message',
                message: 'New message',
                fromUser: message.sender
            });
        });

        // Reaction event
        socket.on("send_reaction", (reaction) => {
            const { chatId, messageId, reaction: type, receiverId } = reaction;
            io.to(receiverId).emit("receive_reaction", { chatId, messageId, reaction: type });
        });

        // Call events
        socket.on("call_user", (data) => {
            io.to(data.userToCall).emit("call_user", {
                signal: data.signalData,
                from: data.from,
                name: data.name,
                isVideo: data.isVideo
            });

            // Send notification
            io.to(data.userToCall).emit("new_notification", {
                type: 'call',
                message: `Incoming ${data.isVideo ? 'video' : 'voice'} call from ${data.name}`,
                fromUser: data.from
            });
        });

        socket.on("answer_call", (data) => {
            io.to(data.to).emit("call_accepted", data.signal);
        });

        socket.on("end_call", (data) => {
            io.to(data.to).emit("call_ended");
        });

        socket.on("disconnect", async () => {
            const userId = onlineUsers.get(socket.id);
            if (userId) {
                console.log(`User ${userId} offline`);

                // Update DB
                try {
                    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
                    await User.findByIdAndUpdate(userId, {
                        isOnline: false,
                        lastSeen: new Date()
                    });
                } catch (e) {
                    console.error('Error updating user status:', e);
                }

                io.emit("user_status_change", { userId, isOnline: false });
                onlineUsers.delete(socket.id);
            }
            console.log("Client disconnected", socket.id);
        });
    });

    httpServer
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });
});
