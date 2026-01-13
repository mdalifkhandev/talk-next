import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import Otp from "@/models/Otp";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendEmail } from "@/lib/mail";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { name, email, password } = registerSchema.parse(body);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    console.log(otp);

    // Save OTP to DB
    await Otp.create({
      email,
      otp,
      expiresAt: otpExpires,
    });

    // Create user but maybe mark as unverified?
    // For simplicity, we'll create the user now but require OTP to login?
    // Or normally, we verify OTP before creating user.
    // Let's create user but we can add 'isVerified' field if needed.
    // Requirement says "login, registration, verify otp".
    // I'll create the user now.

    await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // Send email
    await sendEmail(
      email,
      "Verify your account",
      `<p>Your OTP is: <strong>${otp}</strong></p>`
    );

    return NextResponse.json({ message: "User created. Please verify OTP." });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid data", errors: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
