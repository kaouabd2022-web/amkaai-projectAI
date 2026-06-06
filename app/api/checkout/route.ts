import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    // 1. 🔑 جلب الـ userId فقط (خفيف وسريع جداً ولا ينكسر أبداً)
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", message: "No userId found in session" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const plan = body?.plan;

    if (plan !== "pro" && plan !== "premium") {
      return NextResponse.json(
        { error: "Invalid plan", message: `Plan received: ${plan}` },
        { status: 400 }
      );
    }

    const baseCheckoutUrl =
      plan === "premium"
        ? process.env.LEMON_SQUEEZY_PREMIUM_URL
        : process.env.LEMON_SQUEEZY_PRO_URL;

    if (!baseCheckoutUrl) {
      return NextResponse.json(
        { error: "Missing checkout URL", message: "Environment variables for Lemon Squeezy URLs are missing on the server" },
        { status: 500 }
      );
    }

    // 🔍 2. الاعتماد الكلي على قاعدة البيانات لجلب بيانات المستخدم الآمنة
    let dbUserId = userId;
    let fallbackEmail = "";

    try {
      const user = await db.user.findUnique({
        where: {
          clerkId: userId,
        },
      });
      
      if (user) {
        dbUserId = user.id;
        fallbackEmail = user.email || "";
      }
    } catch (dbError: any) {
      console.warn("Database lookup failed:", dbError);
      // لا تجعل خطأ قاعدة البيانات يوقف الدفع، سيستخدم الـ clerkId كبديل طوارئ
    }

    ////////////////////////////////////////////////////////////////
    // 🔗 🚀 هندسة الرابط الديناميكي لـ Lemon Squeezy 
    ////////////////////////////////////////////////////////////////
    const checkoutParams = new URLSearchParams();
    
    if (fallbackEmail) {
      checkoutParams.append("checkout[email]", fallbackEmail);
    }
    
    const customData = JSON.stringify({ userId: dbUserId, plan });
    checkoutParams.append("checkout[custom][user_id]", dbUserId);
    checkoutParams.append("passthrough", customData); 

    const finalCheckoutUrl = `${baseCheckoutUrl}${baseCheckoutUrl.includes("?") ? "&" : "?"}${checkoutParams.toString()}`;

    // 📊 تسجيل محاولة الدفع المتروكة (محمية بـ try/catch معزول تماماً)
    try {
      if (fallbackEmail) {
        await db.abandonedCheckout.create({
          data: {
            userId: dbUserId,
            email: fallbackEmail,
            checkoutUrl: finalCheckoutUrl,
            plan,
          },
        });
      }
    } catch (e) {
      console.warn("Checkout tracking skipped inside database:", e);
    }

    return NextResponse.json({
      url: finalCheckoutUrl,
    });

  } catch (error: any) {
    console.error("CRITICAL CHECKOUT ERROR:", error);

    // 🔬 كاشف الأخطاء الحقيقي أونلاين: سيعيد لك سبب الـ 500 في صفحة المتصفح فوراً!
    return NextResponse.json(
      {
        error: "Internal Server Error (500)",
        message: error?.message || String(error),
        stack: error?.stack || "No stack trace available"
      },
      {
        status: 500,
      }
    );
  }
}