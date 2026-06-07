import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// 🎯 تحديد المسارات العامة
const isPublicRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/complete-payment",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhook(.*)",
  "/api/checkout(.*)"
]);

export default clerkMiddleware(async (auth, req) => {
  // 🛡️ حماية المسارات الخاصة
  if (!isPublicRoute(req)) {
    await auth.protect(); // 👈 استخدام الكائن الممرر للدالة مباشرة بأمان
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