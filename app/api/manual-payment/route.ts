import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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

    const { plan, screenshotUrl, rip, method, currency } = body;

    if (!plan || !screenshotUrl || !method || !currency) {
      return NextResponse.json(
        { error: "missing_fields" },
        { status: 400 }
      );
    }

    //////////////////////////////////////////////////
    // 💰 PRICE LOGIC
    //////////////////////////////////////////////////
    const amount = plan === "PRO" ? 1500 : 2500;

    //////////////////////////////////////////////////
    // 💾 CREATE PAYMENT
    //////////////////////////////////////////////////
    const payment = await db.manualPayment.create({
      data: {
        userId,
        plan,
        method,
        currency,
        amount,
        screenshotUrl,

        // ✅ FIX: rip → ipAddress
        ipAddress: rip || null,

        status: "PENDING",
      },
    });

    //////////////////////////////////////////////////
    // 📤 RESPONSE
    //////////////////////////////////////////////////
    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      status: payment.status,
    });

  } catch (error) {
    console.error("Manual payment error:", error);

    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}