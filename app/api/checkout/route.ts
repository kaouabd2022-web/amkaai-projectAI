import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const plan = body?.plan;

    if (
      plan !== "pro" &&
      plan !== "premium"
    ) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    const checkoutUrl =
      plan === "premium"
        ? process.env.LEMON_SQUEEZY_PREMIUM_URL
        : process.env.LEMON_SQUEEZY_PRO_URL;

    if (!checkoutUrl) {
      return NextResponse.json(
        {
          error:
            "Missing Lemon checkout URL",
        },
        { status: 500 }
      );
    }

    // لا توقف الدفع إذا فشلت قاعدة البيانات
    try {
      const user =
        await db.user.findUnique({
          where: {
            clerkId: userId,
          },
        });

      if (user) {
        await db.abandonedCheckout.create({
          data: {
            userId: user.id,
            email: user.email,
            checkoutUrl,
            plan,
          },
        });
      }
    } catch (e) {
      console.warn(
        "Checkout tracking skipped:",
        e
      );
    }

    return NextResponse.json({
      url: checkoutUrl,
    });

  } catch (error: any) {
    console.error(
      "CHECKOUT ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Checkout failed",
      },
      {
        status: 500,
      }
    );
  }
}