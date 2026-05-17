import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    //////////////////////////////////////////////////
    // 🔐 AUTH
    //////////////////////////////////////////////////
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "unauthorized" },
        { status: 401 }
      );
    }

    //////////////////////////////////////////////////
    // 📥 INPUT
    //////////////////////////////////////////////////
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "invalid_json" },
        { status: 400 }
      );
    }

    const jobId = body?.jobId;

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId_required" },
        { status: 400 }
      );
    }

    //////////////////////////////////////////////////
    // 🔎 FETCH JOB
    //////////////////////////////////////////////////
    const job = await db.videoJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "job_not_found" },
        { status: 404 }
      );
    }

    //////////////////////////////////////////////////
    // 🔐 OWNERSHIP CHECK
    //////////////////////////////////////////////////
    if (job.userId !== userId) {
      return NextResponse.json(
        { error: "forbidden" },
        { status: 403 }
      );
    }

    //////////////////////////////////////////////////
    // ⚠️ STATE VALIDATION
    //////////////////////////////////////////////////
    if (job.status === "COMPLETED") {
      return NextResponse.json(
        { error: "already_completed" },
        { status: 400 }
      );
    }

    if (job.status === "FAILED") {
      return NextResponse.json(
        { error: "already_failed" },
        { status: 400 }
      );
    }

    if (job.status === "CANCELLED") {
      return NextResponse.json(
        { error: "already_cancelled" },
        { status: 400 }
      );
    }

    //////////////////////////////////////////////////
    // 🚀 CANCEL JOB (ATOMIC)
    //////////////////////////////////////////////////
    await db.videoJob.update({
      where: { id: jobId },
      data: {
        status: "CANCELLED", // ✅ FIXED
        finishedAt: new Date(),
        error: "Cancelled by user",
      },
    });

    //////////////////////////////////////////////////
    // 📤 RESPONSE
    //////////////////////////////////////////////////
    return NextResponse.json({
      success: true,
      status: "cancelled",
    });

  } catch (error) {
    console.error("CANCEL JOB ERROR:", error);

    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}