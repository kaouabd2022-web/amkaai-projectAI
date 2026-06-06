import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    // 1. 🔑 جلب الجلسة السريعة والخفيفة من Clerk (لتجنب الـ Timeout في السيرفر الحقيقي)
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const plan = body?.plan;

    if (plan !== "pro" && plan !== "premium") {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    const baseCheckoutUrl =
      plan === "premium"
        ? process.env.LEMON_SQUEEZY_PREMIUM_URL
        : process.env.LEMON_SQUEEZY_PRO_URL;

    if (!baseCheckoutUrl) {
      return NextResponse.json(
        { error: "Missing checkout URL" },
        { status: 500 }
      );
    }

    // 👤 استخراج البريد الإلكتروني مباشرة من كائن توثيق الجلسة الحالية
    const userEmail = sessionClaims?.email as string || "";

    // 🔍 جلب سجل المستخدم من قاعدة البيانات المحلية للحصول على الـ Local ID
    let dbUserId = userId;
    let fallbackEmail = userEmail;

    try {
      const user = await db.user.findUnique({
        where: {
          clerkId: userId,
        },
      });
      if (user) {
        dbUserId = user.id;
        // 🛠️ تم حل تعارض الـ TypeScript بوضع القيمة البديلة "" في حال كان الحقل نال في قاعدة البيانات
        if (!fallbackEmail) fallbackEmail = user.email || "";
      }
    } catch (dbError) {
      console.warn("Database lookup failed, using clerkId fallback:", dbError);
    }

    ////////////////////////////////////////////////////////////////
    // 🔗 🚀 هندسة الرابط الديناميكي لـ Lemon Squeezy 
    ////////////////////////////////////////////////////////////////
    const checkoutParams = new URLSearchParams();
    
    if (fallbackEmail) {
      checkoutParams.append("checkout[email]", fallbackEmail); // حقن الإيميل تلقائياً في الفاتورة
    }
    
    // تمرير البيانات المخصصة ليعيدها الـ Webhook عند نجاح الدفع لتفعيل الحساب
    const customData = JSON.stringify({ userId: dbUserId, plan });
    checkoutParams.append("checkout[custom][user_id]", dbUserId);
    checkoutParams.append("passthrough", customData); 

    // دمج المتغيرات مع الرابط الأساسي بشكل برمجى صحيح
    const finalCheckoutUrl = `${baseCheckoutUrl}${baseCheckoutUrl.includes("?") ? "&" : "?"}${checkoutParams.toString()}`;

    // 📊 تسجيل محاولة الدفع المتروكة (تغليف ذكي لمنع أي خطأ قاعدة بيانات من تعطيل عملية الدفع)
    try {
      await db.abandonedCheckout.create({
        data: {
          userId: dbUserId,
          email: fallbackEmail || "unknown",
          checkoutUrl: finalCheckoutUrl,
          plan,
        },
      });
    } catch (e) {
      console.warn("Checkout tracking skipped inside database:", e);
    }

    // إرجاع الرابط الديناميكي النهائي الجاهز للتحويل
    return NextResponse.json({
      url: finalCheckoutUrl,
    });
  } catch (error: any) {
    console.error("CRITICAL CHECKOUT ERROR:", error);

    // إرجاع تفاصيل الخطأ في الـ Response لسهولة تتبعه من الـ Network في المتصفح أونلاين
    return NextResponse.json(
      {
        error: "Checkout failed",
        message: error?.message || String(error),
      },
      {
        status: 500,
      }
    );
  }
}