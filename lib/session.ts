const COOKIE_NAME = "gh_admin";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

type SessionPayload = {
  u: string;
  exp: number;
};

export function sessionCookieName() {
  return COOKIE_NAME;
}

export function sessionMaxAgeSeconds() {
  return SESSION_MAX_AGE_SECONDS;
}

export function requestIsHttps(request: { url: string }) {
  return new URL(request.url).protocol === "https:";
}

export async function signSession(username: string, secret: string, now = Date.now()) {
  const payload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify({ u: username, exp: now + SESSION_MAX_AGE_SECONDS * 1000 })),
  );
  const signature = await hmac(payload, secret);
  return `${payload}.${signature}`;
}

export async function readSession(token: string | undefined, secret: string, now = Date.now()) {
  if (!token || !secret) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot !== token.lastIndexOf(".")) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = await hmac(payload, secret);
  if (!safeEqual(signature, expected)) return null;
  let parsed: SessionPayload;
  try {
    parsed = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as SessionPayload;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed.u !== "string" || typeof parsed.exp !== "number") return null;
  if (!Number.isFinite(parsed.exp) || parsed.exp <= now) return null;
  if (parsed.u !== "GeoHillman") return null;
  return { username: parsed.u };
}

export function sessionTokenFromRequest(request: Request) {
  return cookieValue(request.headers.get("cookie"), COOKIE_NAME);
}

export async function adminFromRequest(request: Request) {
  const secret = process.env.SESSION_SECRET ?? "";
  return readSession(sessionTokenFromRequest(request), secret);
}

function cookieValue(header: string | null, name: string) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    if (trimmed.slice(0, eq) === name) return trimmed.slice(eq + 1);
  }
  return undefined;
}

async function hmac(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64UrlEncode(new Uint8Array(signature));
}

function safeEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
