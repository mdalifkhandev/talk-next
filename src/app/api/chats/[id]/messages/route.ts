import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Message from "@/models/Message";
import Chat from "@/models/Chat";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { Server } from "socket.io"; // Note: We can't access the global io instance easily here in App Router without custom server passing it.
// We will rely on the client to emit the message via socket for real-time,
// AND call this API for persistence.
// OR simpler: Client emits socket event, server socket handler saves to DB.
// BUT: for robustness, HTTP POST is often better for saving, then server emits socket event.

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const token = (await cookies()).get("token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: chatId } = await params;
    // Wait, dynamic routes `[id]/route.ts` receive params as second arg.
    // However, I am writing this file to `src/app/api/chats/[id]/messages/route.ts`.

    const messages = await Message.find({ chat: chatId })
      .populate("sender", "name image")
      .sort({ createdAt: 1 });

    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const token = (await cookies()).get("token")?.value;
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const currentUserId = decoded.userId;
    const { content, type } = await req.json();
    const { id: chatId } = await params;

    const newMessage = await Message.create({
      sender: currentUserId,
      chat: chatId,
      content,
      fileType: type || "text",
    });

    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: newMessage._id,
      updatedAt: new Date(),
    });

    // Create notification for receiver
    const chat = await Chat.findById(chatId).populate("participants");
    const receiver = chat?.participants.find(
      (p: any) => p._id.toString() !== currentUserId
    );

    if (receiver) {
      const senderUser = await User.findById(currentUserId);
      const receiverUser = receiver as any;
      if (senderUser && receiverUser.notificationsEnabled) {
        await Notification.create({
          user: receiverUser._id,
          type: "message",
          message: `New message from ${senderUser.name}`,
          fromUser: currentUserId,
          chatId: chatId,
        });
      }
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const { id: chatId } = await params;
    const { messageId, reaction } = await req.json();
    const token = (await cookies()).get("token")?.value;
    if (!token)
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const currentUserId = decoded.userId;

    const message = await Message.findById(messageId);
    if (!message)
      return NextResponse.json(
        { message: "Message not found" },
        { status: 404 }
      );

    // Check if user already reacted, if so update/remove
    const existingReactionIndex = message.reactions.findIndex(
      (r: any) => r.user.toString() === currentUserId
    );

    if (existingReactionIndex > -1) {
      if (message.reactions[existingReactionIndex].type === reaction) {
        // Toggle off if same
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Update
        message.reactions[existingReactionIndex].type = reaction;
      }
    } else {
      message.reactions.push({ user: currentUserId, type: reaction });
    }

    await message.save();
    return NextResponse.json(message);
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
