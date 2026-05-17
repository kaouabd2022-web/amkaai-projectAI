import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PlanType } from "@prisma/client";

// 🎯 PLAN CONFIG
const PLAN_CREDITS = {
  PRO: 120,
  PREMIUM: 320,
} as const;

// ⚠️ allowed events
const ALLOWED_EVENTS = new Set([
  "order_created",
  "subscription_created",
  "subscription_updated",
]);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("📩 Webhook received");

    const eventName = body?.meta?.event_name;
    const eventId = body?.meta?.event_id;

    if (!eventName || !eventId) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    // ❌ ignore unwanted events
    if (!ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json({ ignored: true });
    }

    // 🔒 idempotency check
    const existingEvent = await db.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      console.log("⚠️ Duplicate webhook ignored:", eventId);
      return NextResponse.json({ duplicate: true });
    }

    // 👤 email
    const email = body?.data?.attributes?.user_email;

    if (!email) {
      return NextResponse.json(
        { error: "Missing user email" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 🎯 variant → plan mapping SAFE
    const variantId = body?.data?.attributes?.variant_id?.toString();

    const PRO_VARIANT_ID = process.env.LEMON_SQUEEZY_PRO_VARIANT_ID;
    const PREMIUM_VARIANT_ID = process.env.LEMON_SQUEEZY_PREMIUM_VARIANT_ID;

    let plan: PlanType | null = null;

    if (variantId === PRO_VARIANT_ID) plan = PlanType.PRO;
    if (variantId === PREMIUM_VARIANT_ID) plan = PlanType.PREMIUM;

    if (!plan) {
      console.log("⚠️ Unknown variant:", variantId);
      return NextResponse.json(
        { error: "Unknown plan" },
        { status: 400 }
      );
    }

    const creditsToAdd = PLAN_CREDITS[plan];

    // 📦 lemon ids
    const lemonCustomerId =
      body?.data?.attributes?.customer_id?.toString() || null;

    const lemonSubscriptionId =
      body?.data?.attributes?.subscription_id?.toString() || null;

    // 💳 atomic transaction
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          plan,
          credits: {
            increment: creditsToAdd, // 🔥 safer than overwrite
          },
          lemonCustomerId,
          lemonSubscriptionId,
        },
      }),

      db.webhookEvent.create({
        data: {
          eventId,
        },
      }),
    ]);

    console.log(
      `✅ ${email} upgraded → ${plan} (+${creditsToAdd})`
    );

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🔥 WEBHOOK ERROR:", error);

    return NextResponse.json(
      {
        error: error?.message || "Internal webhook error",
      },
      { status: 500 }
    );
  }
}