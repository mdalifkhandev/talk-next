import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { sendEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email } = await req.json();

    const user = await User.findOne({ email });
    if (!user) {
      // For security, do not reveal if user exists
      return NextResponse.json({ message: "If user exists, OTP sent" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await Otp.create({
      email,
      otp,
      expiresAt: otpExpires,
    });

    // Send email
    await sendEmail(
      email,
      "Reset Password",
      `<p>Your OTP for password reset is: <strong>${otp}</strong></p>`
    );

    return NextResponse.json({ message: "If user exists, OTP sent" });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
