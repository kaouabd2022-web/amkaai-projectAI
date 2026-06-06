import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { useCredits, refundCredits, markUsageSuccess } from "@/lib/credits";
import { LIMITS, FEATURES } from "@/lib/config";

export async function POST(req: Request) {
  // 1. إنشاء معرف فريد للعملية لتتبع الاستهلاك والـ Refund
  const referenceId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    // 🔒 التحقق من هوية المستخدم عبر Clerk (تم إضافة await لحل مشكلة Type error بشكل نهائي)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ⚡ التحقق من الـ Feature Flag (هل ميزة الفيديو مفعلة في الموقع؟)
    if (!FEATURES.enableVideoQueue) {
      return NextResponse.json({ error: "Video generation is temporarily disabled" }, { status: 503 });
    }

    // 📦 استقبال وقراءة البيانات القادمة من واجهة المستخدم (الـ Console)
    const body = await req.json();
    const { prompt, aspectRatio, creativity } = body;

    // 🔐 التحقق من قيود الـ Prompt الأمنية المحددة في ملف الـ Config
    if (!prompt || prompt.length < LIMITS.minPromptLength) {
      return NextResponse.json({ error: `Prompt too short. Minimum ${LIMITS.minPromptLength} characters.` }, { status: 400 });
    }
    if (prompt.length > LIMITS.maxPromptLength) {
      return NextResponse.json({ error: `Prompt too long. Maximum ${LIMITS.maxPromptLength} characters.` }, { status: 400 });
    }

    // 🛡️ [خطوة مصيرية] محاولة حجز النقاط وفحص اشتراك Lemon Squeezy
    // إذا كان الاشتراك منتهياً أو النقاط لا تكفي، سيرمي الكود خطأ (Error) ويتوقف فوراً هنا دون لمس سيرفرات الـ AI تلافياً للخسارة المادية.
    const creditResult = await useCredits(userId, "video", { reference: referenceId });

    try {
      
      //////////////////////////////////////////////////////////////////
      // 🎬 هنا يتم استدعاء سيرفر الذكاء الاصطناعي (مثال باستخدام Replicate)
      //////////////////////////////////////////////////////////////////
      /*
      const response = await fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: "نظام_توليد_الفيديو_الخاص_بك",
          input: { 
            prompt, 
            aspect_ratio: aspectRatio,
            prompt_strength: creativity 
          },
        }),
      });

      if (!response.ok) {
        throw new Error("AI_SERVER_ERROR");
      }
      
      const prediction = await response.json();
      */
      //////////////////////////////////////////////////////////////////

      // محاكاة مؤقتة لنجاح التوليد (امسح السطر في الأسفل عند ربط السيرفر الفعلي أعلاه)
      const prediction = { id: "pred_123", status: "starting" };

      // 🎯 تثبيت نجاح العملية في قاعدة البيانات وتحويل حالة الـ Usage من PENDING إلى COMPLETED
      await markUsageSuccess(referenceId);

      return NextResponse.json({
        success: true,
        predictionId: prediction.id,
        remainingCredits: creditResult.remainingCredits,
      });

    } catch (aiError) {
      // 💸 [صمام أمان] إذا فشل سيرفر الـ AI الخارجي أو قطع الاتصال، يتم استرجاع نقاط المستخدم فوراً تلقائياً
      console.error("🔥 AI Generation Call Failed, triggering refund...");
      await refundCredits(referenceId);
      
      return NextResponse.json({ error: "Failed to communicate with AI engine. Credits refunded." }, { status: 502 });
    }

  } catch (error: any) {
    console.error("🔥 GENERATE VIDEO ROUTE ERROR:", error);

    // معالجة الأخطاء القادمة من دالة useCredits لمنح واجهة المستخدم رسالة واضحة
    if (error.message === "SUBSCRIPTION_EXPIRED_OR_INACTIVE") {
      return NextResponse.json({ error: "Your subscription has expired or is past due. Please check your billing dashboard." }, { status: 403 });
    }
    if (error.message === "NOT_ENOUGH_CREDITS") {
      return NextResponse.json({ error: "Insufficient credits. Please upgrade your plan to generate videos." }, { status: 402 });
    }

    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}