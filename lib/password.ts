import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "crypto";

const N = 16384;
const r = 8;
const p = 1;
const keylen = 64;
const options: ScryptOptions = { N, r, p, maxmem: 64 * 1024 * 1024 };

function scrypt(password: string, salt: Buffer, length: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, length, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, keylen);
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  if (Number(parts[1]) !== N || Number(parts[2]) !== r || Number(parts[3]) !== p) return false;
  const salt = Buffer.from(parts[4], "hex");
  const expected = Buffer.from(parts[5], "hex");
  if (salt.length !== 16 || expected.length !== keylen) return false;
  const hash = await scrypt(password, salt, keylen);
  return timingSafeEqual(hash, expected);
}
