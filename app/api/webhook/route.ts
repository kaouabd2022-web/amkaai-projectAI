import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PlanType } from "@prisma/client";
import { PLANS, getPlanFromVariant } from "@/lib/config"; // 📦 استيراد مصدر الحقيقة الموحد
import crypto from "crypto";

// ⚠️ الأحداث المدعومة والمنظمة بناءً على وظيفتها وحمايتها
const ALLOWED_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_payment_success",
  "subscription_expired"
]);

export async function POST(req: Request) {
  try {
    // 🔒 1. التحقق من توقيع Lemon Squeezy لمنع أي اختراق أو طلبات وهمية
    const rawBody = await req.text(); // قراءة النص الخام ضرورية للتحقق من التوقيع
    const hmac = crypto.createHmac("sha256", process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "");
    const digest = Buffer.from(hmac.update(rawBody).digest("hex"), "utf8");
    const signature = Buffer.from(req.headers.get("X-Signature") || "", "utf8");

    if (signature.length !== digest.length || !crypto.timingSafeEqual(digest, signature)) {
      console.error("❌ Webhook unauthorized: Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    console.log("📩 Secure Webhook received");

    const eventName = body?.meta?.event_name;
    const eventId = body?.meta?.event_id;

    if (!eventName || !eventId) {
      return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
    }

    // ❌ تجاهل الأحداث غير المهمة لتقليل استهلاك السيرفر
    if (!ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json({ ignored: true }, { status: 200 });
    }

    // 🔒 2. فحص التكرار (Idempotency Check) لمنع تكرار شحن النقاط لنفس الطلب
    const existingEvent = await db.webhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      console.log("⚠️ Duplicate webhook ignored:", eventId);
      return NextResponse.json({ duplicate: true }, { status: 200 });
    }

    const attributes = body?.data?.attributes;
    const email = attributes?.user_email;

    if (!email) {
      return NextResponse.json({ error: "Missing user email" }, { status: 400 });
    }

    // 👤 البحث عن المستخدم في قاعدة البيانات
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 🎯 تحويل الـ Variant ID القادم إلى نوع الخطة المقابلة من ملف الـ Config
    const variantId = attributes?.variant_id;
    const planName = getPlanFromVariant(variantId); // يعيد "pro" أو "premium" أو null

    if (!planName) {
      console.log("⚠️ Unknown variant ID:", variantId);
      return NextResponse.json({ error: "Unknown variant" }, { status: 400 });
    }

    // تحويل صيغة النص لتتوافق تماماً مع الـ Enum في قاعدة البيانات (PRO, PREMIUM)
    const dbPlan = planName.toUpperCase() as PlanType;
    const creditsToGrant = PLANS[planName].credits;

    const lemonCustomerId = attributes?.customer_id?.toString() || null;
    const lemonSubscriptionId = body?.data?.id?.toString() || null; // معرّف الاشتراك الفريد من ليمون
    const subscriptionStatus = attributes?.status; // الحالات: active, cancelled, expired, past_due
    const endsAt = attributes?.ends_at ? new Date(attributes?.ends_at) : null;

    // 🔍 جلب معرّف الاشتراك الفريد من قاعدة البيانات إن وجد مسبقًا لتجنب أخطاء قيود الحقول
    const existingSubscription = await db.subscription.findFirst({
      where: { userId: user.id }
    });

    ////////////////////////////////////////////////////////////////
    // 🧠 هندسة أحداث الاشتراكات (Subscription Logic Handler)
    ////////////////////////////////////////////////////////////////

    // الحالة الأولى: إنشاء اشتراك جديد لأول مرة (شحن أولي)
    if (eventName === "subscription_created") {
      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: {
            plan: dbPlan,
            credits: { increment: creditsToGrant }, // شحن النقاط الافتتاحية
            lemonCustomerId,
            lemonSubscriptionId,
          },
        }),
        db.subscription.upsert({
          where: { 
            id: existingSubscription?.id || "non_existent_id",
          },
          update: { 
            status: subscriptionStatus, 
            ...(endsAt ? { endsAt } : {}) 
          },
          create: { 
            userId: user.id, 
            status: subscriptionStatus, 
            
            // 🛠️ حل المشكلة الحالي: تزويد الحقل المطلوب "plan" بشكل آمن ومرن لتغطية الـ Enum أو الـ String
            plan: dbPlan, 
            
            // احتياطياً في حال كان مسمى الحقل في جدول الاشتراك هو planType
            ...(dbPlan ? { planType: dbPlan } : {}),

            // حشر الـ Variant ID ديناميكياً لتغطية المسميين المحتملين
            ...(variantId ? {
              variantId: String(variantId),
              variant_id: String(variantId)
            } : {}),
            
            // تمرير آمن لمعرف اشتراك ليمون
            ...(lemonSubscriptionId ? {
              lemonSubscriptionId: lemonSubscriptionId,
              lemonSqueezyId: lemonSubscriptionId,
            } : {}),
            ...(endsAt ? { endsAt } : {})
          },
        }),
        db.webhookEvent.create({ data: { eventId } }),
      ]);
      console.log(`✅ ${email} Subscribed to ${dbPlan} (+${creditsToGrant} credits)`);
    }

    // الحالة الثانية: نجاح التجديد الشهري التلقائي (شحن الدورة الشهرية الجديدة)
    else if (eventName === "subscription_payment_success") {
      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: {
            credits: { increment: creditsToGrant }, // إضافة النقاط للشهر الجديد فور نجاح الدفع
          },
        }),
        db.subscription.updateMany({
          where: { userId: user.id },
          data: { 
            status: "active",
            ...(endsAt ? { endsAt: null } : {})
          }, 
        }),
        db.webhookEvent.create({ data: { eventId } }),
      ]);
      console.log(`🔄 ${email} Subscription renewed for ${dbPlan} (+${creditsToGrant} credits)`);
    }

    // الحالة الثالثة: تحديث حالة الاشتراك أو انتهاء صلاحيته بالكامل (إيقاف وحظر)
    else if (eventName === "subscription_updated" || eventName === "subscription_expired") {
      const isEnded = ["expired", "unpaid", "past_due"].includes(subscriptionStatus);

      await db.$transaction([
        db.subscription.updateMany({
          where: { userId: user.id },
          data: { 
            status: subscriptionStatus,
            ...(endsAt ? { endsAt: endsAt } : {})
          },
        }),
        ...(isEnded ? [
          db.user.update({
            where: { id: user.id },
            data: { plan: PlanType.FREE }
          })
        ] : []),
        db.webhookEvent.create({ data: { eventId } }),
      ]);
      console.log(`ℹ️ ${email} Subscription updated status to: ${subscriptionStatus}`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("🔥 WEBHOOK ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Internal webhook error" },
      { status: 500 }
    );
  }
}