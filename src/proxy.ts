import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/constants";
import { decodeSession } from "@/lib/auth/session";
import { canSeeDashboard } from "@/lib/dashboard/access";

const PUBLIC_PREFIXES = [
  "/login",
  "/set-password",
  "/style-guide",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/set-password",
  "/api/cron",
  "/brand",
  "/favicon",
];

function isPublic(pathname: string) {
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return true;
  }
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  const session = decodeSession(sessionCookie);

  if (pathname === "/login" && sessionCookie) {
    const dest = canSeeDashboard(session?.role) ? "/" : "/my-work";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (!isPublic(pathname) && !sessionCookie) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") {
      login.searchParams.set("next", pathname);
    }
    return NextResponse.redirect(login);
  }

  // Viewers (client-portal stand-in) do not land on the executive Dashboard.
  if (pathname === "/" && sessionCookie && !canSeeDashboard(session?.role)) {
    return NextResponse.redirect(new URL("/my-work", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
