import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// We want the main generator and chords to be public, but the Library is strictly for logged-in users.
const isProtectedRoute = createRouteMatcher([
  '/library(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
