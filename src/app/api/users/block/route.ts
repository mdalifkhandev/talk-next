import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "@/models/User";
import dbConnect from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// POST /api/users/block - Block or unblock a user
export async function POST(req: Request) {
  try {
    await dbConnect();

    // Get current user from token
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const { targetUserId, action } = await req.json();

    if (!targetUserId || !action) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const currentUser = await User.findById(decoded.userId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (action === "block") {
      // Add to blocked users if not already blocked
      if (!currentUser.blockedUsers) {
        currentUser.blockedUsers = [];
      }
      const isAlreadyBlocked = currentUser.blockedUsers.some(
        (id: any) => id.toString() === targetUserId
      );
      if (!isAlreadyBlocked) {
        currentUser.blockedUsers.push(
          new mongoose.Types.ObjectId(targetUserId)
        );
      }

      // Add to blockedBy for target user
      if (!targetUser.blockedBy) {
        targetUser.blockedBy = [];
      }
      const isAlreadyBlockedBy = targetUser.blockedBy.some(
        (id: any) => id.toString() === decoded.userId
      );
      if (!isAlreadyBlockedBy) {
        targetUser.blockedBy.push(new mongoose.Types.ObjectId(decoded.userId));
      }
    } else if (action === "unblock") {
      // Remove from blocked users
      if (currentUser.blockedUsers) {
        currentUser.blockedUsers = currentUser.blockedUsers.filter(
          (id: any) => id.toString() !== targetUserId
        );
      }

      // Remove from blockedBy for target user
      if (targetUser.blockedBy) {
        targetUser.blockedBy = targetUser.blockedBy.filter(
          (id: any) => id.toString() !== decoded.userId
        );
      }
    }

    await currentUser.save();
    await targetUser.save();

    return NextResponse.json({
      message: `User ${action}ed successfully`,
      blocked: action === "block",
    });
  } catch (error) {
    console.error("Error blocking/unblocking user:", error);
    return NextResponse.json(
      { message: "Failed to update block status" },
      { status: 500 }
    );
  }
}
