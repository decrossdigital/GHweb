import { NextResponse } from "next/server";
import { requestIsHttps, sessionCookieName } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: requestIsHttps(request),
    path: "/",
    maxAge: 0,
  });
  return response;
}
