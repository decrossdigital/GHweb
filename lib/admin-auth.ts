import { promises as fs } from "fs";
import path from "path";

const AUTH_FILE = path.join(process.cwd(), "data", "admin-auth.json");

type AdminAuth = {
  username: string;
  passwordHash: string;
};

export function adminAuthPath() {
  return AUTH_FILE;
}

export async function readAdminAuth() {
  await ensureAuthFile();
  const raw = await fs.readFile(AUTH_FILE, "utf8");
  const parsed = JSON.parse(raw) as Partial<AdminAuth>;
  if (parsed.username !== "GeoHillman" || typeof parsed.passwordHash !== "string" || !parsed.passwordHash) {
    throw new Error("Admin auth file is incomplete");
  }
  return { username: parsed.username, passwordHash: parsed.passwordHash };
}

export async function writePasswordHash(passwordHash: string) {
  const current = await readAdminAuth();
  const next: AdminAuth = { username: current.username, passwordHash };
  const temporary = `${AUTH_FILE}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`);
  await fs.rename(temporary, AUTH_FILE);
}

async function ensureAuthFile() {
  try {
    await fs.access(AUTH_FILE);
    return;
  } catch {
    // Seed once from the env hash. A later password change lives only in this file.
  }
  const username = process.env.ADMIN_USERNAME?.trim();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (username !== "GeoHillman" || !passwordHash) {
    throw new Error("Admin auth is not configured");
  }
  await fs.mkdir(path.dirname(AUTH_FILE), { recursive: true });
  const body = `${JSON.stringify({ username, passwordHash }, null, 2)}\n`;
  try {
    await fs.writeFile(AUTH_FILE, body, { flag: "wx" });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "EEXIST") throw error;
  }
}
