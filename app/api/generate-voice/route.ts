import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { addJob } from "@/lib/queue";
import { useCredits, refundCredits, markUsageSuccess } from "@/lib/credits";
import { demoVoices } from "@/lib/demo";
import { PlanType } from "@prisma/client";
import { LIMITS } from "@/lib/config";

export async function POST(req: Request) {
  // 🎯 إنشاء معرّف فريد للعملية لربط العمليات الحسابية بنظام الـ Refund
  const referenceId = `voc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    console.log("🚀 VOICE API HIT");

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

    // 📦 PARSE BODY
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { text } = body;

    // 🔐 التحقق من قيود النص المدخل بناءً على ملف الـ Config الموحد
    if (!text || text.trim().length < LIMITS.minPromptLength) {
      return NextResponse.json(
        { error: `Valid text is required (Minimum ${LIMITS.minPromptLength} characters)` },
        { status: 400 }
      );
    }
    if (text.length > LIMITS.maxTextLength) {
      return NextResponse.json(
        { error: `Text too long. Maximum ${LIMITS.maxTextLength} characters.` },
        { status: 400 }
      );
    }

    console.log("📝 Voice text:", text);

    //////////////////////////////////////////////////
    // 💸 USE CREDITS & SUBSCRIPTION CHECK (آمن للجميع)
    //////////////////////////////////////////////////
    let creditResult;
    try {
      // دالة useCredits ستقوم بالتحقق من اشتراك Lemon Squeezy وخصم النقاط بناءً على نوع الحساب
      creditResult = await useCredits(user.id, "voice", { reference: referenceId });
    } catch (err: any) {
      if (err.message === "SUBSCRIPTION_EXPIRED_OR_INACTIVE") {
        return NextResponse.json({ error: "Your subscription has expired. Please check your billing dashboard." }, { status: 403 });
      }
      return NextResponse.json({ error: err.message || "Not enough credits" }, { status: 402 });
    }

    //////////////////////////////////////////////////
    // 🧠 DEMO MODE (إرجاع النتيجة الفورية للمجاني بعد خصم نقاطه بنجاح)
    //////////////////////////////////////////////////
    if (user.plan === PlanType.FREE) {
      const randomVoice = demoVoices[Math.floor(Math.random() * demoVoices.length)];

      // بما أن العملية نجحت وحصل على ملف تجريبي، نعلّم الاستهلاك كـ COMPLETED فوراً
      await markUsageSuccess(referenceId);

      return NextResponse.json({
        success: true,
        demo: true,
        audio: randomVoice,
        remainingCredits: creditResult.remainingCredits,
        message: "Demo preview — Upgrade to Pro for real AI voice",
      });
    }

    // فتح بلوك try/catch داخلي لحماية عمليات الطابور الخلفي للمشتركين (Pro / Premium)
    try {
      // 📦 CREATE VOICE JOB IN DATABASE
      const job = await db.voiceJob.create({
        data: {
          userId: user.id,
          text,
          status: "PENDING",
        },
      });

      console.log("🎤 VOICE JOB CREATED IN DB:", job.id);

      // 🧠 ADD TO BACKGROUND QUEUE
      addJob({
        id: job.id,
        type: "voice",
      });

      console.log("📤 VOICE JOB SENT TO QUEUE");

      // علم العملية كـ COMPLETED لنجاح دخولها الطابور الخلفي بنجاح
      await markUsageSuccess(referenceId);

      // 🚀 RESPONSE
      return NextResponse.json({
        success: true,
        jobId: job.id,
        status: "PENDING",
        message: "Voice is being generated in the background",
        remainingCredits: creditResult.remainingCredits,
      });

    } catch (queueOrDbError) {
      // 💸 [صمام أمان الطوارئ] إذا فشل السيرفر في إدخال العملية للطابور، يتم رد النقاط تلقائياً
      console.error("🔥 Voice Job creation or Queue failed! Triggering automatic refund...", queueOrDbError);
      await refundCredits(referenceId);

      return NextResponse.json(
        { error: "Voice pipeline failed. Your credits have been securely refunded." },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("🔥 VOICE API FATAL ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}