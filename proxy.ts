import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSession, sessionCookieName } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await readSession(request.cookies.get(sessionCookieName())?.value, process.env.SESSION_SECRET ?? "");
  const signedIn = session?.username === "GeoHillman";

  if (pathname === "/admin/login") {
    if (signedIn) return NextResponse.redirect(new URL("/admin", request.url));
    return NextResponse.next();
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!signedIn) return NextResponse.redirect(new URL("/admin/login", request.url));
    return NextResponse.next();
  }

  if (!signedIn) {
    return NextResponse.json({ error: "Login failed." }, { status: 401 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/content", "/api/upload", "/api/admin/password"],
};
