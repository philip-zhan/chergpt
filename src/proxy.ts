import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  const session = await auth.api.getSession({ headers: await headers() });

  if (!session && !pathname.startsWith("/auth")) {
    return redirectToLogin(request);
  }
  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const redirectTo = request.nextUrl.pathname + request.nextUrl.search;
  return NextResponse.redirect(
    new URL(`/auth/sign-in?redirectTo=${redirectTo}`, request.url)
  );
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
