import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminApp } from "@/components/admin/AdminApp";
import { readContent } from "@/lib/content";
import { readSession, sessionCookieName } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const jar = await cookies();
  const session = await readSession(jar.get(sessionCookieName())?.value, process.env.SESSION_SECRET ?? "");
  if (session?.username !== "GeoHillman") redirect("/admin/login");
  const content = await readContent();
  return <AdminApp initial={content} />;
}
