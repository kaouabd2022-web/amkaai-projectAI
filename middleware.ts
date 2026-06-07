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

export default clerkMiddleware((auth, req) => {
  // ❌ مهم: لا تجعل /api/checkout public

  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: [
    /*
     ⚠️ هذا هو السطر السحري
     يجبر middleware يشتغل على API
    */
    "/((?!_next|.*\\..*).*)",
  ],
};