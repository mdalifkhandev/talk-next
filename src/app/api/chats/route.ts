import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Chat from '@/models/Chat';
import User from '@/models/User'; // Ensure User model is loaded
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function GET(req: Request) {
    try {
        await dbConnect();
        const token = (await cookies()).get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const currentUserId = decoded.userId;

        const chats = await Chat.find({
            participants: currentUserId
        })
            .populate('participants', 'name email image isOnline')
            .populate('lastMessage')
            .sort({ updatedAt: -1 });

        return NextResponse.json(chats);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        await dbConnect();
        const token = (await cookies()).get('token')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const currentUserId = decoded.userId;
        const { partnerId } = await req.json();

        // Check if chat already exists
        const existingChat = await Chat.findOne({
            isGroup: false,
            participants: { $all: [currentUserId, partnerId] }
        });

        if (existingChat) {
            return NextResponse.json(existingChat);
        }

        const newChat = await Chat.create({
            participants: [currentUserId, partnerId],
            isGroup: false
        });

        return NextResponse.json(newChat);
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
