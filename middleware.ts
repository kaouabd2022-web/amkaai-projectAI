import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 🎯 تحديد المسارات العامة المتاحة للجميع (الزوار والمشتركين) دون الحاجة لتسجيل الدخول
const isPublicRoute = createRouteMatcher([
  "/",                     // صفحة الهبوط (Landing Page)
  "/sign-in(.*)",          // صفحة تسجيل الدخول
  "/sign-up(.*)",          // صفحة إنشاء حساب جديد
  "/pricing",              // صفحة خطط الأسعار
  "/complete-payment",     // صفحة نجاح الدفع بعد ليمون سكويزي
  
  // 🍋 تأمين الـ Webhooks (تأكد من مطابقتها لكل مسارات الـ API العامة لديك)
  "/api/webhook(.*)",      // تم تعديلها للمفرد والجمع لتشمل /api/webhook و /api/webhook/lemon-squeezy
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const currentUrl = new URL(req.url);

  // 1. 🛡️ حماية المسارات الخاصة (Dashboard, Generation, etc.)
  // إذا كان المستخدم يحاول دخول صفحة خاصة وهو غير مسجل، Clerk سيحوله تلقائياً لصفحة الـ sign-in
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  // 2. 🔄 توجيه ذكي (Smart Redirection)
  // إذا كان المستخدم "مسجل دخوله بالفعل" وحاول العودة لصفحات التسجيل (sign-in أو sign-up)
  // ننقله فوراً إلى داخل المنصة (مثلاً صفحة الـ /dashboard) بدلاً من تركه يرى صفحة الدخول مجدداً
  if (userId && (currentUrl.pathname.startsWith("/sign-in") || currentUrl.pathname.startsWith("/sign-up"))) {
    const dashboardUrl = new URL("/dashboard", req.url); // تغيير /dashboard إلى المسار الرئيسي لبرنامجك إذا كان مختلفاً
    return NextResponse.redirect(dashboardUrl);
  }
});

export const config = {
  matcher: [
    // استثناء ملفات Next.js الداخلية والملفات الثابتة (الصور، الأيقونات) من الفحص لسرعة الأداء
    "/((?!_next|[^?]*\\.[^?]+).*)",
    // فحص جميع مسارات الـ API و tRPC دائماً
    "/(api|trpc)(.*)",
  ],
};