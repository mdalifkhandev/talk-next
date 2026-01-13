import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
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

        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');

        if (!query) {
            // Return all users or maybe friend suggestions?
            // For now, return top 20 users excluding self
            const users = await User.find({ _id: { $ne: currentUserId } })
                .select('name email image isOnline')
                .limit(20);
            return NextResponse.json(users);
        }

        const users = await User.find({
            _id: { $ne: currentUserId },
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } },
            ],
        }).select('name email image isOnline');

        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
