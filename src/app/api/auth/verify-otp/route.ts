import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Otp from '@/models/Otp';
import User from '@/models/User';

export async function POST(req: Request) {
    try {
        await dbConnect();
        const { email, otp } = await req.json();

        const validOtp = await Otp.findOne({
            email,
            otp,
            expiresAt: { $gt: new Date() },
        });

        if (!validOtp) {
            return NextResponse.json({ message: 'Invalid or expired OTP' }, { status: 400 });
        }

        // Verify user (optional: update user isVerified field if added)
        // await User.findOneAndUpdate({ email }, { isVerified: true });

        // Clean up OTP
        await Otp.deleteOne({ _id: validOtp._id });

        return NextResponse.json({ message: 'OTP verified successfully' });
    } catch (error) {
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
