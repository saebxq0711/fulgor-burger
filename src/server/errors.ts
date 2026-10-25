export type DomainErrorCode =
  | "VALIDATION"
  | "SLOT_NOT_FOUND"
  | "SLOT_CLOSED"
  | "SLOT_NOT_OPEN_YET"
  | "SOLD_OUT"
  | "PRODUCT_UNAVAILABLE"
  | "TOO_MANY_UNITS"
  | "ORDERS_PAUSED"
  | "IDEMPOTENCY_CONFLICT"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "INVALID_TRANSITION"
  | "CAPACITY_BELOW_RESERVED"
  | "CONFLICT"
  | "FORBIDDEN";

/** Error de negocio con un código estable; su mensaje es seguro para mostrar. */
export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/** Busca un código de PostgreSQL en el error o en su causa (drizzle envuelve los errores de pg). */
export function pgErrorOf(error: unknown): { code?: string; message?: string; constraint?: string } | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth++) {
    const candidate = current as { code?: unknown; message?: unknown; constraint?: unknown; cause?: unknown };
    if (typeof candidate.code === "string" && /^[0-9A-Z]{5}$/.test(candidate.code)) {
      return {
        code: candidate.code,
        message: typeof candidate.message === "string" ? candidate.message : undefined,
        constraint: typeof candidate.constraint === "string" ? candidate.constraint : undefined,
      };
    }
    current = candidate.cause;
  }
  return undefined;
}
