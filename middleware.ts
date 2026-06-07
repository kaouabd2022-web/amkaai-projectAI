import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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

  if (!isPublicRoute(req)) {
    await auth.protect(); // ✅ هذا هو الحل
  }

});

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
  ],
};