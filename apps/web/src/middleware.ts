import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Dashboard pages redirect to sign-in. API routes are NOT protected here: they call
// requireUser() themselves so they can return a JSON 401 instead of a redirect/404.
const isProtectedPage = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedPage(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next internals, static files and the public SDK bundle.
    "/((?!_next|sdk/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
