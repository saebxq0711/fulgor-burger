import "server-only";
import { eq } from "drizzle-orm";
import type { DbExecutor } from "../db/client";
import { deliveryRules, deliverySlots, type DeliveryRule } from "../db/schema";
import { addDays, businessDateString, weekdayOf, zonedInstant } from "@/lib/time";

export type Occurrence = {
  deliveryDate: string;
  startsAt: Date;
  endsAt: Date;
  opensAt: Date;
  closesAt: Date;
};

type RuleTiming = Pick<
  DeliveryRule,
  "weekday" | "startTime" | "endTime" | "openDaysBefore" | "openTime" | "closeDaysBefore" | "closeTime" | "weeksAhead"
>;

export function occurrenceFor(rule: RuleTiming, deliveryDate: string): Occurrence {
  const startsAt = zonedInstant(deliveryDate, rule.startTime);
  const endsAt = zonedInstant(deliveryDate, rule.endTime);
  const opensAt = zonedInstant(addDays(deliveryDate, -rule.openDaysBefore), rule.openTime);
  const closesAt = zonedInstant(addDays(deliveryDate, -rule.closeDaysBefore), rule.closeTime);
  return { deliveryDate, startsAt, endsAt, opensAt, closesAt };
}

/** Problemas de una regla (vacío = válida). */
export function validateRuleTiming(rule: RuleTiming): string[] {
  const problems: string[] = [];
  const sample = occurrenceFor(rule, "2030-01-06");
  if (sample.endsAt <= sample.startsAt) problems.push("La hora de fin debe ser posterior a la de inicio.");
  if (sample.closesAt > sample.endsAt) problems.push("El cierre de pedidos no puede ser después de terminar la entrega.");
  if (sample.opensAt >= sample.closesAt) problems.push("La apertura de pedidos debe ser antes del cierre.");
  return problems;
}

/**
 * Próximas `weeksAhead` fechas de la regla que todavía no han cerrado.
 * Las fechas ya cerradas no se generan: el historial existente se conserva tal cual.
 */
export function upcomingOccurrences(rule: RuleTiming, now: Date): Occurrence[] {
  const today = businessDateString(now);
  const delta = (rule.weekday - weekdayOf(today) + 7) % 7;
  const result: Occurrence[] = [];
  for (let week = 0; result.length < rule.weeksAhead && week < rule.weeksAhead + 3; week++) {
    const occurrence = occurrenceFor(rule, addDays(today, delta + week * 7));
    if (occurrence.closesAt > now) result.push(occurrence);
  }
  return result;
}

/**
 * Publica las fechas que tocan según las reglas activas. Es idempotente: la restricción
 * única (regla, fecha) impide duplicados aunque se ejecute en paralelo o muchas veces.
 */
export async function ensureUpcomingSlots(db: DbExecutor, now = new Date()): Promise<number> {
  const rules = await db.select().from(deliveryRules).where(eq(deliveryRules.active, true));
  let created = 0;
  for (const rule of rules) {
    if (validateRuleTiming(rule).length) continue;
    for (const occurrence of upcomingOccurrences(rule, now)) {
      const inserted = await db
        .insert(deliverySlots)
        .values({
          ruleId: rule.id,
          deliveryDate: occurrence.deliveryDate,
          startsAt: occurrence.startsAt,
          endsAt: occurrence.endsAt,
          opensAt: occurrence.opensAt,
          closesAt: occurrence.closesAt,
          capacity: rule.capacity,
          status: "open",
        })
        .onConflictDoNothing({ target: [deliverySlots.ruleId, deliverySlots.deliveryDate] })
        .returning({ id: deliverySlots.id });
      created += inserted.length;
    }
  }
  return created;
}

let lastEnsureAt = 0;

/** Igual que ensureUpcomingSlots pero como máximo una vez por minuto por instancia. */
export async function ensureUpcomingSlotsThrottled(db: DbExecutor, now = new Date()): Promise<void> {
  if (now.getTime() - lastEnsureAt < 60_000) return;
  lastEnsureAt = now.getTime();
  try {
    await ensureUpcomingSlots(db, now);
  } catch (error) {
    lastEnsureAt = 0;
    throw error;
  }
}

export function resetScheduleThrottle() {
  lastEnsureAt = 0;
}
