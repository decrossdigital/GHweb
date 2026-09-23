import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCallback);
const N = 16384;
const r = 8;
const p = 1;
const keylen = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = (await scrypt(password, salt, keylen, { N, r, p, maxmem: 64 * 1024 * 1024 })) as Buffer;
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  if (Number(parts[1]) !== N || Number(parts[2]) !== r || Number(parts[3]) !== p) return false;
  const salt = Buffer.from(parts[4], "hex");
  const expected = Buffer.from(parts[5], "hex");
  if (salt.length !== 16 || expected.length !== keylen) return false;
  const hash = (await scrypt(password, salt, keylen, { N, r, p, maxmem: 64 * 1024 * 1024 })) as Buffer;
  return timingSafeEqual(hash, expected);
}
