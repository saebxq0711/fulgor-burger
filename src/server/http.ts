import "server-only";
import { timingSafeEqual } from "node:crypto";
import { DomainError, type DomainErrorCode } from "./errors";

const STATUS_BY_CODE: Record<DomainErrorCode, number> = {
  VALIDATION: 422,
  TOO_MANY_UNITS: 422,
  SLOT_NOT_FOUND: 404,
  NOT_FOUND: 404,
  SLOT_CLOSED: 409,
  SLOT_NOT_OPEN_YET: 409,
  SOLD_OUT: 409,
  PRODUCT_UNAVAILABLE: 409,
  ORDERS_PAUSED: 409,
  IDEMPOTENCY_CONFLICT: 409,
  INVALID_TRANSITION: 409,
  CAPACITY_BELOW_RESERVED: 409,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  FORBIDDEN: 403,
};

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

/** Convierte un error en respuesta segura: nunca filtra detalles internos. */
export function errorResponse(error: unknown) {
  if (error instanceof DomainError) {
    const headers: Record<string, string> = {};
    const retryAfter = error.details.retryAfterSeconds;
    if (typeof retryAfter === "number") headers["Retry-After"] = String(retryAfter);
    return json({ ok: false, code: error.code, message: error.message, ...error.details }, STATUS_BY_CODE[error.code], headers);
  }
  console.error("[api] error inesperado", error);
  return json({ ok: false, code: "INTERNAL", message: "Algo salió mal de nuestro lado. Inténtalo de nuevo en un momento." }, 500);
}

/** IP del cliente según el proxy de la plataforma. Solo se usa anonimizada. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Exige que una petición de escritura venga de esta misma web (protección CSRF y contra
 * formularios de terceros). Los navegadores siempre envían Origin en POST.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    if (host && originHost === host) return true;
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    return Boolean(site && new URL(site).host === originHost);
  } catch {
    return false;
  }
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export const MAX_JSON_BYTES = 8 * 1024;

export async function readJson(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new DomainError("VALIDATION", "Formato de solicitud inválido.");
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) throw new DomainError("VALIDATION", "Solicitud demasiado grande.");
  try {
    return JSON.parse(text);
  } catch {
    throw new DomainError("VALIDATION", "Formato de solicitud inválido.");
  }
}
