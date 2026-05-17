import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addJob } from "@/lib/queue"; // ✅ FIX هنا
import { auth } from "@clerk/nextjs/server";

const COST_PER_VIDEO = 5;
const MAX_ACTIVE_JOBS = 3;

export async function POST(req: Request) {
  try {
    // 🔐 AUTH
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 📥 INPUT SAFE PARSING
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const prompt = body?.prompt?.trim();
    const priority = Number.isFinite(body?.priority)
      ? Number(body.priority)
      : 0;

    if (!prompt || prompt.length < 3) {
      return NextResponse.json(
        { error: "Prompt too short" },
        { status: 400 }
      );
    }

    // 👤 GET USER
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 🚫 LIMIT ACTIVE JOBS
    const activeJobs = await db.videoJob.count({
      where: {
        userId: user.id,
        status: {
          in: ["PENDING", "PROCESSING"],
        },
      },
    });

    if (activeJobs >= MAX_ACTIVE_JOBS) {
      return NextResponse.json(
        { error: "Too many active jobs" },
        { status: 429 }
      );
    }

    // 💰 ATOMIC CREDIT DEDUCTION
    const creditDeduct = await db.user.updateMany({
      where: {
        id: user.id,
        credits: { gte: COST_PER_VIDEO },
      },
      data: {
        credits: { decrement: COST_PER_VIDEO },
      },
    });

    if (creditDeduct.count === 0) {
      return NextResponse.json(
        { error: "Not enough credits" },
        { status: 403 }
      );
    }

    // 📦 CREATE JOB
    const job = await db.videoJob.create({
      data: {
        userId: user.id,
        prompt,
        priority,
        status: "PENDING",
        attempts: 0,
      },
    });

    // 💳 CREATE USAGE
    const usage = await db.usage.create({
      data: {
        userId: user.id,
        type: "video",
        cost: COST_PER_VIDEO,
        status: "PENDING",
        referenceId: job.id,
      },
    });

    // 🔗 LINK USAGE
    await db.videoJob.update({
      where: { id: job.id },
      data: {
        usageId: usage.id,
      },
    });

    // 🚀 ADD TO INTERNAL QUEUE (بدون Redis)
    addJob({
      id: job.id,
      type: "video",
      priority: Math.max(1, Math.min(priority, 10)),
    });

    // 📤 RESPONSE
    return NextResponse.json({
      jobId: job.id,
      status: "queued",
      cost: COST_PER_VIDEO,
    });

  } catch (error) {
    console.error("CREATE VIDEO ERROR:", error);

    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}