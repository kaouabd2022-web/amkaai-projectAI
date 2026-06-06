import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { addJob } from "@/lib/queue";
import { useCredits, refundCredits, markUsageSuccess } from "@/lib/credits";
import { demoImages } from "@/lib/demo";
import { LIMITS } from "@/lib/config";

export async function POST(req: Request) {
  // 🎯 إنشاء معرّف فريد للعملية لربط حجز النقاط وإرجاعها
  const referenceId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    console.log("🚀 IMAGE API HIT");

    // 🔐 AUTH (التحقق من Clerk)
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 👤 GET USER
    let user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    // ✅ إنشاء المستخدم تلقائياً في قاعدة البيانات إذا لم يكن موجوداً
    if (!user) {
      user = await db.user.create({
        data: {
          clerkId: userId,
          credits: 10,
          plan: "FREE",
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

    const { prompt } = body;

    // 🔐 التحقق من قيود الـ Prompt الأمنية من ملف الـ Config
    if (!prompt || prompt.trim().length < LIMITS.minPromptLength) {
      return NextResponse.json(
        { error: `Valid prompt is required (Minimum ${LIMITS.minPromptLength} characters)` },
        { status: 400 }
      );
    }
    if (prompt.length > LIMITS.maxPromptLength) {
      return NextResponse.json(
        { error: `Prompt too long. Maximum ${LIMITS.maxPromptLength} characters.` },
        { status: 400 }
      );
    }

    console.log("📝 Prompt:", prompt);

    //////////////////////////////////////////////////
    // 🧠 DEMO MODE (المستخدمين المجانيين)
    //////////////////////////////////////////////////
    if (user.plan === "FREE") {
      const randomImage = demoImages[Math.floor(Math.random() * demoImages.length)];

      return NextResponse.json({
        success: true,
        demo: true,
        image: randomImage,
      });
    }

    //////////////////////////////////////////////////
    // 💸 USE CREDITS (حجز النقاط وفحص اشتراك ليمون سكويزي)
    //////////////////////////////////////////////////
    let creditResult;
    try {
      // 🛡️ تم تمرير الـ referenceId لربطه بجدول الـ Usage بنجاح
      creditResult = await useCredits(user.id, "image", { reference: referenceId });
    } catch (err: any) {
      if (err.message === "SUBSCRIPTION_EXPIRED_OR_INACTIVE") {
        return NextResponse.json({ error: "Your subscription has expired. Please check your billing dashboard." }, { status: 403 });
      }
      return NextResponse.json({ error: err.message || "Not enough credits" }, { status: 402 });
    }

    // فتح بلوك try/catch داخلي لحماية العملية وتفعيل الـ Refund فوراً في حال سقوط خادم الطابور أو الـ DB
    try {
      // 📦 CREATE IMAGE JOB IN DATABASE
      const job = await db.imageJob.create({
        data: {
          userId: user.id,
          prompt,
          status: "PENDING",
          // يمكنك حفظ الـ referenceId هنا أيضاً في قاعدة بياناتك إذا أردت تتبعاً أدق
        },
      });

      console.log("🎨 IMAGE JOB CREATED IN DB:", job.id);

      // 🧠 ADD TO BACKGROUND QUEUE (إرسال المهمة للـ Worker)
      addJob({
        id: job.id,
        type: "image",
      });

      console.log("📤 IMAGE JOB SENT TO QUEUE");

      // 🎯 بما أن المهمة أرسلت للطابور الخلفي بنجاح، نعلّم الاستهلاك كـ COMPLETED
      // ملاحظة: الـ Worker في الخلفية هو من سيقوم بتحديث حقل الـ job status إلى SUCCESS لاحقاً عند انتهاء التوليد.
      await markUsageSuccess(referenceId);

      // 🚀 RESPONSE
      return NextResponse.json({
        success: true,
        jobId: job.id,
        status: "PENDING",
        message: "Image is being generated in the background",
        remainingCredits: creditResult.remainingCredits,
      });

    } catch (queueOrDbError) {
      // 💸 [صمام أمان الطوارئ] إذا فشل حفظ الـ Job أو فشل الـ Queue، يتم استرداد النقاط فوراً تلقائياً!
      console.error("🔥 Job creation or Queue injection failed! Triggering automatic refund...", queueOrDbError);
      await refundCredits(referenceId);

      return NextResponse.json(
        { error: "Generation pipeline failed. Your credits have been securely refunded." },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("🔥 IMAGE API FATAL ERROR:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: String(error) },
      { status: 500 }
    );
  }
}