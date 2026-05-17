import { NextResponse } from "next/server";
import { db } from "@/lib/db";

//////////////////////////////////////////////////
// 🚀 APPROVE MANUAL PAYMENT (PRODUCTION SAFE)
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
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const paymentId = body?.paymentId;

    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId required" },
        { status: 400 }
      );
    }

    //////////////////////////////////////////////////
    // 🔎 GET PAYMENT (SAFE SELECT)
    //////////////////////////////////////////////////
    const payment = await db.manualPayment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        userId: true,
        plan: true,
        status: true,
        verified: true,
        aiScore: true, // ✅ مهم
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    //////////////////////////////////////////////////
    // 🚫 PREVENT DOUBLE APPROVAL (CRITICAL)
    //////////////////////////////////////////////////
    if (payment.status === "COMPLETED") {
      return NextResponse.json({
        success: true,
        message: "Already approved",
      });
    }

    //////////////////////////////////////////////////
    // 🧠 AI FRAUD CHECK (SAFE)
    //////////////////////////////////////////////////
    if (
      payment.verified === false &&
      payment.aiScore !== null &&
      payment.aiScore < 0.5 // threshold قابل للتعديل
    ) {
      return NextResponse.json(
        { error: "Payment flagged as risky by AI" },
        { status: 400 }
      );
    }

    //////////////////////////////////////////////////
    // 👤 GET USER
    //////////////////////////////////////////////////
    const user = await db.user.findUnique({
      where: { id: payment.userId },
      select: { id: true, credits: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    //////////////////////////////////////////////////
    // 💰 CREDIT CALCULATION (SCALABLE)
    //////////////////////////////////////////////////
    const PLAN_CREDITS: Record<string, number> = {
      FREE: 50,
      PRO: 100,
      PREMIUM: 300,
    };

    const creditsToAdd = PLAN_CREDITS[payment.plan] ?? 50;

    //////////////////////////////////////////////////
    // 💾 TRANSACTION (ATOMIC + SAFE)
    //////////////////////////////////////////////////
    await db.$transaction(async (tx) => {
      // 🔒 double-check داخل transaction
      const freshPayment = await tx.manualPayment.findUnique({
        where: { id: payment.id },
        select: { status: true },
      });

      if (freshPayment?.status === "COMPLETED") {
        return;
      }

      await tx.manualPayment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          verified: true,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          credits: { increment: creditsToAdd },
        },
      });
    });

    //////////////////////////////////////////////////
    // 📤 RESPONSE
    //////////////////////////////////////////////////
    return NextResponse.json({
      success: true,
      creditsAdded: creditsToAdd,
    });

  } catch (error) {
    console.error("APPROVE PAYMENT ERROR:", error);

    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}