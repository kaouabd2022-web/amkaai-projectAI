import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 🎯 تحديد المسارات العامة (التي لا تحتاج لتسجيل دخول مطلقاً)
const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/complete-payment",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook(.*)" // الـ Webhook يجب أن يظل عاماً دائماً لكي تستقبله المنصات الخارجية
]);

export default clerkMiddleware(async (auth, req) => {
  // 🛡️ إذا كان المسار ليس عاماً (مثل مسارات الـ dashboard والـ api/checkout) فقم بحمايته
  if (!isPublicRoute(req)) {
    await auth.protect(); // 👈 هذا يضمن تهيئة الـ auth للـ API والـ Checkout بنجاح أونلاين
  }
});

export const config = {
  matcher: [
    // 🛡️ الفلتر القياسي من Clerk لمنع فحص الملفات الثابتة والصور لسرعة الاستجابة
    '/((?!_next|[^?]*\\.(?:html|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // ⚡ إجبار الميدلوير على معالجة كافة مسارات الـ API و tRPC دائماً لكي تعمل دالة auth() أونلاين
    '/(api|trpc)(.*)',
  ],
};