import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 🎯 PUBLIC ROUTES (لا تحتاج تسجيل دخول)
const isPublicRoute = createRouteMatcher([
  "/",                      // Landing
  "/sign-in(.*)",           // Login
  "/sign-up(.*)",           // Register
  "/pricing",               // Pricing page
  "/complete-payment",      // Success page
  "/api/webhook(.*)",       // Lemon webhook ONLY
]);

export default clerkMiddleware(async (auth, req) => {
  const currentUrl = new URL(req.url);

  //////////////////////////////////////////////////
  // 🛡️ PROTECT PRIVATE ROUTES
  //////////////////////////////////////////////////
  if (!isPublicRoute(req)) {
    await auth.protect();
    return NextResponse.next();
  }

  //////////////////////////////////////////////////
  // 🔄 REDIRECT IF ALREADY LOGGED IN
  //////////////////////////////////////////////////
  if (
    currentUrl.pathname.startsWith("/sign-in") ||
    currentUrl.pathname.startsWith("/sign-up")
  ) {
    const { userId } = await auth();

    if (userId) {
      return NextResponse.redirect(
        new URL("/dashboard", req.url)
      );
    }
  }

  return NextResponse.next();
});

//////////////////////////////////////////////////
// ⚡ MATCHER (مهم جدًا)
//////////////////////////////////////////////////

export const config = {
  matcher: [
    // تجاهل الملفات الثابتة
    "/((?!_next|[^?]*\\.(?:html|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",

    // تشغيل middleware على API
    "/(api|trpc)(.*)",
  ],
};