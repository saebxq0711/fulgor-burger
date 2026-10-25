import "server-only";
import { createHash, createHmac } from "node:crypto";

function appSecret(): string {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("APP_SECRET no está configurado o es demasiado corto (mínimo 32 caracteres).");
  }
  return secret;
}

/** HMAC estable para anonimizar datos (IP, teléfono) antes de usarlos como clave. */
export function anonymize(value: string): string {
  return createHmac("sha256", appSecret()).update(value).digest("base64url").slice(0, 32);
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
