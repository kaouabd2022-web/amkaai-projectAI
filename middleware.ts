Vimport { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 👇 المسارات العامة
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pricing",
  "/complete-payment",
  "/api/webhook(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  const url = new URL(req.url);

  // 🔐 حماية كل شيء ما عدا public
  if (!isPublicRoute(req)) {
    if (!userId) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
  }

  // 🔁 redirect إذا user دخل sign-in وهو مسجل
  if (
    (url.pathname.startsWith("/sign-in") ||
      url.pathname.startsWith("/sign-up")) &&
    userId
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     ✅ هذا أهم شيء:
     يجبر middleware يشتغل على:
     - الصفحات
     - API routes
    */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};