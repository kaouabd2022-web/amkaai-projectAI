import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import Tesseract from "tesseract.js";
import { PlanType } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId required" },
        { status: 400 }
      );
    }

    const payment = await db.manualPayment.findUnique({
      where: { id: paymentId },
    });

    if (!payment || !payment.screenshotUrl) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    // 🧠 OCR processing
    const result = await Tesseract.recognize(
      payment.screenshotUrl,
      "eng"
    );

    const text = result.data.text.toLowerCase();

    // 🔍 normalize RIP
    const rip = process.env.BARIDIMOB_RIP?.toLowerCase() || "";
    const amount = payment.amount.toString();

    const hasRip = rip.length > 3 && text.includes(rip.slice(0, 6));
    const hasAmount = text.includes(amount);

    // 🔁 duplicate check
    const existing = await db.manualPayment.findFirst({
      where: {
        screenshotUrl: payment.screenshotUrl,
        NOT: { id: paymentId },
      },
    });

    if (existing) {
      await db.manualPayment.update({
        where: { id: paymentId },
        data: {
          status: "REJECTED",
          aiScore: 0,
          verified: false,
        },
      });

      return NextResponse.json({
        ok: false,
        error: "Duplicate screenshot",
      });
    }

    // 🧠 AI SCORE
    const score =
      (hasRip ? 0.5 : 0) +
      (hasAmount ? 0.5 : 0);

    let status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING";

    if (score >= 0.8) status = "APPROVED";
    else if (score < 0.5) status = "REJECTED";

    // 💾 update payment
    await db.manualPayment.update({
      where: { id: paymentId },
      data: {
        aiScore: score,
        verified: score >= 0.8,
        status,
      },
    });

    // ⚡ auto activate user (ONLY if approved)
    if (status === "APPROVED") {
      await db.user.update({
        where: { clerkId: payment.userId },
        data: {
          plan: payment.plan as PlanType,
          credits: payment.plan === "PRO"
            ? 150
            : payment.plan === "PREMIUM"
            ? 300
            : 50,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      score,
      status,
    });

  } catch (err) {
    console.error("VERIFY PAYMENT ERROR:", err);

    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}