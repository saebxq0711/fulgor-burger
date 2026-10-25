import "server-only";
import { eq, sql } from "drizzle-orm";
import type { DbExecutor } from "../db/client";
import { rateLimits } from "../db/schema";

export type RateLimitResult = { allowed: boolean; count: number; retryAfterSeconds: number };

/**
 * Ventana fija atómica en PostgreSQL: funciona igual con varias instancias del servidor.
 * Cuenta el intento y responde si sigue dentro del límite.
 */
export async function hitRateLimit(
  db: DbExecutor,
  key: string,
  limit: number,
  windowSeconds: number,
  now = new Date(),
): Promise<RateLimitResult> {
  const windowStartFloor = new Date(now.getTime() - windowSeconds * 1000);
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart: now, count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.windowStart} <= ${windowStartFloor.toISOString()}::timestamptz THEN 1 ELSE ${rateLimits.count} + 1 END`,
        windowStart: sql`CASE WHEN ${rateLimits.windowStart} <= ${windowStartFloor.toISOString()}::timestamptz THEN ${now.toISOString()}::timestamptz ELSE ${rateLimits.windowStart} END`,
      },
    })
    .returning({ count: rateLimits.count, windowStart: rateLimits.windowStart });

  const elapsed = (now.getTime() - row.windowStart.getTime()) / 1000;
  return {
    allowed: row.count <= limit,
    count: row.count,
    retryAfterSeconds: Math.max(1, Math.ceil(windowSeconds - elapsed)),
  };
}

/** Cuenta actual de la ventana sin sumar un intento (para límites que solo cuentan fallos). */
export async function currentRateCount(db: DbExecutor, key: string, windowSeconds: number, now = new Date()): Promise<number> {
  const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, key));
  if (!row || row.windowStart.getTime() <= now.getTime() - windowSeconds * 1000) return 0;
  return row.count;
}

/** Limpieza oportunista de ventanas viejas (se llama desde el cron). */
export async function purgeRateLimits(db: DbExecutor, olderThanSeconds = 86400, now = new Date()) {
  const floor = new Date(now.getTime() - olderThanSeconds * 1000);
  await db.delete(rateLimits).where(sql`${rateLimits.windowStart} < ${floor.toISOString()}::timestamptz`);
}
