import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { JobStatus } from "@prisma/client";

//////////////////////////////////////////////////
// 🧠 STATUS MAPPER (FIX TS + CLEAN UX)
//////////////////////////////////////////////////

function mapStatus(status: JobStatus): string {
  switch (status) {
    case "PENDING":
      return "pending";
    case "PROCESSING":
      return "processing";
    case "COMPLETED":
      return "done";
    case "FAILED":
      return "failed";
    case "CANCELLED":
      return "cancelled";
    default:
      return "unknown";
  }
}

//////////////////////////////////////////////////
// 🚀 VIDEO JOB STATUS API (PRODUCTION READY)
//////////////////////////////////////////////////

export async function POST(req: Request) {
  try {
    //////////////////////////////////////////////////
    // 📥 INPUT SAFE PARSING
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
    // 🔎 FETCH JOB (optimized)
    //////////////////////////////////////////////////
    const job = await db.videoJob.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        priority: true,
        createdAt: true,
        resultUrl: true,
        error: true,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: "job_not_found" },
        { status: 404 }
      );
    }

    //////////////////////////////////////////////////
    // ⚡ FAST EXIT STATES
    //////////////////////////////////////////////////

    if (job.status === "CANCELLED") {
      return NextResponse.json({
        status: "cancelled",
        video: null,
        position: null,
        estimatedTime: 0,
      });
    }

    if (job.status === "COMPLETED") {
      return NextResponse.json({
        status: "done",
        video: job.resultUrl,
        position: 0,
        estimatedTime: 0,
      });
    }

    if (job.status === "FAILED") {
      return NextResponse.json({
        status: "failed",
        video: null,
        position: null,
        estimatedTime: 0,
        error: job.error ?? "Generation failed",
      });
    }

    //////////////////////////////////////////////////
    // 📊 QUEUE POSITION (efficient ranking)
    //////////////////////////////////////////////////

    const position = await db.videoJob.count({
      where: {
        status: {
          in: ["PENDING", "PROCESSING"],
        },
        OR: [
          {
            priority: { gt: job.priority },
          },
          {
            priority: job.priority,
            createdAt: { lt: job.createdAt },
          },
        ],
      },
    });

    //////////////////////////////////////////////////
    // ⏱ ESTIMATION ENGINE
    //////////////////////////////////////////////////

    const baseTimePerJob =
      job.priority >= 8
        ? 12
        : job.priority >= 4
        ? 20
        : 30;

    const estimatedTime = position * baseTimePerJob;

    //////////////////////////////////////////////////
    // 🔄 ACTIVE STATES
    //////////////////////////////////////////////////

    if (job.status === "PENDING") {
      return NextResponse.json({
        status: "pending",
        video: null,
        position,
        estimatedTime,
      });
    }

    if (job.status === "PROCESSING") {
      return NextResponse.json({
        status: "processing",
        video: null,
        position,
        estimatedTime: Math.max(estimatedTime, 5),
      });
    }

    //////////////////////////////////////////////////
    // 🧠 FALLBACK (FIXED ❌ toLowerCase ERROR)
    //////////////////////////////////////////////////

    return NextResponse.json({
      status: mapStatus(job.status), // ✅ FIX
      video: job.resultUrl ?? null,
      position,
      estimatedTime,
    });

  } catch (error) {
    console.error("STATUS API ERROR:", error);

    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}