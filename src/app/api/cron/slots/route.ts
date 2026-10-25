import { getDb } from "@/server/db/client";
import { errorResponse, json, safeEqual } from "@/server/http";
import { purgeRateLimits } from "@/server/services/rate-limit";
import { ensureUpcomingSlots } from "@/server/services/schedule";

export const dynamic = "force-dynamic";

/**
 * Tarea programada: publica las fechas semanales y limpia contadores viejos.
 * Protegida con CRON_SECRET (Vercel Cron lo envía como "Authorization: Bearer …").
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 16 || !safeEqual(header, `Bearer ${secret}`)) {
    return json({ ok: false, code: "UNAUTHORIZED", message: "No autorizado." }, 401);
  }
  try {
    const db = getDb();
    const created = await ensureUpcomingSlots(db);
    await purgeRateLimits(db);
    return json({ ok: true, created });
  } catch (error) {
    return errorResponse(error);
  }
}
