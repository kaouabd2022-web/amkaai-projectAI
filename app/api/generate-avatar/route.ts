import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { useCredits, refundCredits, markUsageSuccess } from "@/lib/credits";
import { demoAvatars } from "@/lib/demo";
import { PlanType } from "@prisma/client";

export async function POST() {
  // 🎯 إنشاء معرّف فريد للعملية لربط حجز النقاط وإرجاعها في حال الفشل مستقبلاً
  const referenceId = `avt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    console.log("🚀 AVATAR API HIT");

    // 🔐 AUTH (التحقق من Clerk)
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 👤 GET USER
    let user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    // ✅ إنشاء المستخدم تلقائياً إذا لم يكن مسجلاً في قاعدة البيانات
    if (!user) {
      user = await db.user.create({
        data: {
          clerkId: userId,
          credits: 10,
          plan: PlanType.FREE,
        },
      });
      console.log("✅ New user created on the fly:", user.id);
    }

    //////////////////////////////////////////////////
    // 💸 USE CREDITS & SUBSCRIPTION CHECK (آمن وصارم)
    //////////////////////////////////////////////////
    let creditResult;
    try {
      // 🛠️ تم التعديل هنا: تمرير "image" بدلًا من "avatar" للتوافق مع أنواع TypeScript المقبولة في دالة useCredits
      creditResult = await useCredits(user.id, "image", { reference: referenceId });
    } catch (err: any) {
      if (err.message === "SUBSCRIPTION_EXPIRED_OR_INACTIVE") {
        return NextResponse.json({ error: "Your subscription has expired. Please check your billing dashboard." }, { status: 403 });
      }
      return NextResponse.json({ error: err.message || "Not enough credits" }, { status: 402 });
    }

    //////////////////////////////////////////////////
    // 🧠 DEMO MODE (FREE USERS)
    //////////////////////////////////////////////////
    if (user.plan === PlanType.FREE) {
      const avatar = demoAvatars[Math.floor(Math.random() * demoAvatars.length)];

      // علم العملية كـ COMPLETED لأن الخدمة سلمت النتيجة الفورية للمستخدم
      await markUsageSuccess(referenceId);

      return NextResponse.json({
        success: true,
        avatar,
        demo: true,
        remainingCredits: creditResult.remainingCredits,
      });
    }

    //////////////////////////////////////////////////
    // 💎 PRO / PREMIUM (FUTURE REAL AI / CURRENT DEMO)
    //////////////////////////////////////////////////
    try {
      
      /* 💡 مكان ربط الـ API الحقيقي مستقبلاً (مثل Leonardo AI أو Replicate):
         const response = await fetch("https://api.replicate.com/v1/predictions", { ... });
         if (!response.ok) throw new Error("AI_SERVER_FAILED");
         const data = await response.json();
         const avatarUrl = data.output;
      */

      // المحاكاة المؤقتة للمشتركين (سيتم خصم النقاط منهم بشكل صحيح الآن)
      const avatar = demoAvatars[Math.floor(Math.random() * demoAvatars.length)];

      // علم العملية كـ COMPLETED لنجاح توليد الأفاتار للمشتركين
      await markUsageSuccess(referenceId);

      return NextResponse.json({
        success: true,
        avatar,
        demo: false,
        remainingCredits: creditResult.remainingCredits,
      });

    } catch (aiError) {
      // 💸 صمام الأمان: في حال قمت بربط الـ API الفعلي مستقبلاً وفشل السيرفر الخارجي، يتم رد النقاط فوراً
      console.error("🔥 Avatar AI pipeline failed, triggering refund...", aiError);
      await refundCredits(referenceId);

      return NextResponse.json(
        { error: "Avatar generation failed. Your credits have been securely refunded." },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("🔥 AVATAR API FATAL ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}