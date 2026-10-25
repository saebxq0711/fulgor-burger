import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

const KEY_LENGTH = 64;
const PARAMS = { N: 32768, r: 8, p: 1 } as const;
const MAX_MEMORY = 128 * PARAMS.N * PARAMS.r * 2;

function scrypt(password: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export const MIN_PASSWORD_LENGTH = 12;

export function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  if (password.length > 200) return "La contraseña es demasiado larga.";
  if (new Set(password).size < 5) return "La contraseña es demasiado repetitiva.";
  return null;
}

/** Formato: scrypt$N$r$p$salt$hash (base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, { ...PARAMS, maxmem: MAX_MEMORY });
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltText, hashText] = parts;
  const expected = Buffer.from(hashText, "base64url");
  const options = { N: Number(n), r: Number(r), p: Number(p) };
  const key = await scrypt(password, Buffer.from(saltText, "base64url"), expected.length, {
    ...options,
    maxmem: 128 * options.N * options.r * 2,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Hash ficticio para igualar tiempos cuando el usuario no existe. */
export const DUMMY_HASH =
  "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
