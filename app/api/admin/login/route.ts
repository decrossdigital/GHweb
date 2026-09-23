import { NextResponse } from "next/server";
import { readAdminAuth } from "@/lib/admin-auth";
import { verifyPassword } from "@/lib/password";
import { requestIsHttps, sessionCookieName, sessionMaxAgeSeconds, signSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let username = "";
  let password = "";
  try {
    const body = (await request.json()) as { username?: unknown; password?: unknown };
    if (typeof body.username === "string") username = body.username;
    if (typeof body.password === "string") password = body.password;
  } catch {
    return NextResponse.json({ error: "Login failed." }, { status: 401 });
  }

  const secret = process.env.SESSION_SECRET ?? "";
  if (!secret) return NextResponse.json({ error: "Login failed." }, { status: 401 });

  let passwordOk = false;
  let userOk = false;
  try {
    const auth = await readAdminAuth();
    passwordOk = await verifyPassword(password, auth.passwordHash);
    userOk = username === "GeoHillman" && username === auth.username;
  } catch {
    return NextResponse.json({ error: "Login failed." }, { status: 401 });
  }

  if (!userOk || !passwordOk) {
    return NextResponse.json({ error: "Login failed." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName(), await signSession(username, secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: requestIsHttps(request),
    path: "/",
    maxAge: sessionMaxAgeSeconds(),
  });
  return response;
}
