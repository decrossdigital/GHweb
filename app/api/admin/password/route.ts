import { NextResponse } from "next/server";
import { readAdminAuth, writePasswordHash } from "@/lib/admin-auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { adminFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await adminFromRequest(request);
  if (!session) return NextResponse.json({ error: "Login failed." }, { status: 401 });

  let currentPassword = "";
  let newPassword = "";
  let confirmPassword = "";
  try {
    const body = (await request.json()) as {
      currentPassword?: unknown;
      newPassword?: unknown;
      confirmPassword?: unknown;
    };
    if (typeof body.currentPassword === "string") currentPassword = body.currentPassword;
    if (typeof body.newPassword === "string") newPassword = body.newPassword;
    if (typeof body.confirmPassword === "string") confirmPassword = body.confirmPassword;
  } catch {
    return NextResponse.json({ error: "Could not read the password form." }, { status: 400 });
  }

  if (newPassword.length < 16) {
    return NextResponse.json({ error: "New password must be at least 16 characters." }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "New password and confirmation do not match." }, { status: 400 });
  }

  const auth = await readAdminAuth();
  const currentOk = await verifyPassword(currentPassword, auth.passwordHash);
  if (!currentOk) {
    return NextResponse.json({ error: "Current password is wrong." }, { status: 400 });
  }

  await writePasswordHash(await hashPassword(newPassword));
  return NextResponse.json({ ok: true });
}
