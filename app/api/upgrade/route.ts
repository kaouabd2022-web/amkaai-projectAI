import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { JobStatus } from "@prisma/client";

export async function POST() {
  try {
    const { userId } = await auth();

    // 🔒 auth check
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 👤 upgrade user to PRO
    const updatedUser = await db.user.update({
      where: { clerkId: userId },
      data: {
        plan: "PRO",
        credits: {
          increment: 50, // bonus PRO
        },
      },
    });

    // 🚀 boost all active jobs
    await db.videoJob.updateMany({
      where: {
        userId: updatedUser.id,
        status: {
          in: [JobStatus.PENDING, JobStatus.PROCESSING],
        },
      },
      data: {
        priority: 1,
      },
    });

    return NextResponse.json({
      success: true,
      message: "User upgraded to PRO successfully",
      user: {
        plan: updatedUser.plan,
        credits: updatedUser.credits,
      },
    });

  } catch (error) {
    console.error("UPGRADE ERROR:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}