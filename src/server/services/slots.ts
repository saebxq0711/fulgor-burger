import "server-only";
import { and, asc, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database, DbExecutor } from "../db/client";
import { deliveryRules, deliverySlots, orders, type SlotStatus } from "../db/schema";
import { DomainError, pgErrorOf } from "../errors";
import { isValidDateString, isValidTime, zonedInstant } from "@/lib/time";
import { reservedUnitsSql } from "./availability";
import { validateRuleTiming } from "./schedule";

const time = z.string().refine(isValidTime, { error: "Usa el formato HH:MM (24 horas)." });
const dateString = z.string().refine(isValidDateString, { error: "Fecha inválida." });
const capacity = z.coerce
  .number({ error: "Escribe un número." })
  .int({ error: "Debe ser un número entero." })
  .min(0, { error: "No puede ser negativa." })
  .max(5000, { error: "Capacidad demasiado alta." });

export const slotInputSchema = z.object({
  deliveryDate: dateString,
  label: z
    .string()
    .trim()
    .max(60, { error: "Máximo 60 caracteres." })
    .transform((value) => value || null),
  startTime: time,
  endTime: time,
  closeDate: dateString,
  closeTime: time,
  capacity,
});

export type SlotInput = z.input<typeof slotInputSchema>;

function slotInstants(data: z.output<typeof slotInputSchema>) {
  const startsAt = zonedInstant(data.deliveryDate, data.startTime);
  const endsAt = zonedInstant(data.deliveryDate, data.endTime);
  const closesAt = zonedInstant(data.closeDate, data.closeTime);
  if (endsAt <= startsAt) throw new DomainError("VALIDATION", "La hora de fin debe ser posterior a la de inicio.", { fields: { endTime: "Debe ser posterior al inicio." } });
  if (closesAt > endsAt) throw new DomainError("VALIDATION", "El cierre de pedidos no puede ser después de la entrega.", { fields: { closeTime: "Debe ser antes de terminar la entrega." } });
  return { startsAt, endsAt, closesAt };
}

function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "_form");
      fields[key] ??= issue.message;
    }
    throw new DomainError("VALIDATION", "Revisa los campos marcados.", { fields });
  }
  return parsed.data;
}

/** Crea una fecha extraordinaria (no ligada a una regla semanal). Abre de inmediato. */
export async function createSpecialSlot(db: DbExecutor, input: SlotInput, now = new Date()) {
  const data = parseOrThrow(slotInputSchema, input);
  const { startsAt, endsAt, closesAt } = slotInstants(data);
  if (closesAt <= now) throw new DomainError("VALIDATION", "El cierre ya pasó: elige una hora de cierre futura.", { fields: { closeTime: "Ya pasó." } });
  const [slot] = await db
    .insert(deliverySlots)
    .values({ deliveryDate: data.deliveryDate, label: data.label, startsAt, endsAt, closesAt, opensAt: null, capacity: data.capacity, status: "open" })
    .returning();
  return slot;
}

/** Edita horarios, cierre, nombre y capacidad de una fecha. La capacidad no puede quedar bajo lo reservado. */
export async function updateSlot(db: Database, slotId: string, input: SlotInput) {
  const data = parseOrThrow(slotInputSchema, input);
  const { startsAt, endsAt, closesAt } = slotInstants(data);
  return db.transaction(async (tx) => {
    const [slot] = await tx.select().from(deliverySlots).where(eq(deliverySlots.id, slotId)).for("update");
    if (!slot) throw new DomainError("NOT_FOUND", "La fecha no existe.");
    const [{ reserved }] = await tx.select({ reserved: reservedUnitsSql }).from(deliverySlots).where(eq(deliverySlots.id, slotId));
    if (data.capacity < reserved) {
      throw new DomainError("CAPACITY_BELOW_RESERVED", `Ya hay ${reserved} reservadas: la capacidad no puede ser menor.`, {
        fields: { capacity: `Mínimo ${reserved}.` },
      });
    }
    try {
      const [updated] = await tx
        .update(deliverySlots)
        .set({ deliveryDate: data.deliveryDate, label: data.label, startsAt, endsAt, closesAt, capacity: data.capacity, updatedAt: new Date() })
        .where(eq(deliverySlots.id, slotId))
        .returning();
      return updated;
    } catch (error) {
      const pg = pgErrorOf(error);
      if (pg?.code === "23505") throw new DomainError("CONFLICT", "Ya existe otra fecha de la misma regla ese día.");
      if (pg?.code === "P0001") throw new DomainError("CAPACITY_BELOW_RESERVED", "La capacidad no puede ser menor que lo reservado.");
      throw error;
    }
  });
}

/** Ajuste rápido de capacidad. */
export async function setSlotCapacity(db: Database, slotId: string, newCapacity: number) {
  const value = parseOrThrow(capacity, newCapacity);
  return db.transaction(async (tx) => {
    const [slot] = await tx.select().from(deliverySlots).where(eq(deliverySlots.id, slotId)).for("update");
    if (!slot) throw new DomainError("NOT_FOUND", "La fecha no existe.");
    const [{ reserved }] = await tx.select({ reserved: reservedUnitsSql }).from(deliverySlots).where(eq(deliverySlots.id, slotId));
    if (value < reserved) {
      throw new DomainError("CAPACITY_BELOW_RESERVED", `Ya hay ${reserved} reservadas: la capacidad no puede ser menor.`);
    }
    const [updated] = await tx.update(deliverySlots).set({ capacity: value, updatedAt: new Date() }).where(eq(deliverySlots.id, slotId)).returning();
    return updated;
  });
}

/** Abrir, pausar o cerrar una fecha. Reabrir una fecha vencida exige mover su cierre. */
export async function setSlotStatus(db: DbExecutor, slotId: string, status: SlotStatus, now = new Date()) {
  const [slot] = await db.select().from(deliverySlots).where(eq(deliverySlots.id, slotId));
  if (!slot) throw new DomainError("NOT_FOUND", "La fecha no existe.");
  if (status === "open" && slot.closesAt <= now) {
    throw new DomainError("VALIDATION", "Su hora de cierre ya pasó. Edita la fecha y pon un cierre futuro para reabrirla.");
  }
  const [updated] = await db
    .update(deliverySlots)
    .set({ status, updatedAt: new Date() })
    .where(eq(deliverySlots.id, slotId))
    .returning();
  return updated;
}

/** Abre ya una fecha que estaba programada para abrir más adelante. */
export async function openSlotNow(db: DbExecutor, slotId: string, now = new Date()) {
  const [updated] = await db
    .update(deliverySlots)
    .set({ opensAt: now, status: "open", updatedAt: now })
    .where(and(eq(deliverySlots.id, slotId), sql`${deliverySlots.closesAt} > ${now.toISOString()}::timestamptz`))
    .returning();
  if (!updated) throw new DomainError("VALIDATION", "No se puede abrir: la fecha no existe o ya cerró.");
  return updated;
}

/** Borra una fecha solo si nunca tuvo pedidos; si los tuvo, se cierra para conservar el historial. */
export async function deleteSlot(db: DbExecutor, slotId: string) {
  const [{ value }] = await db.select({ value: count() }).from(orders).where(eq(orders.slotId, slotId));
  if (value > 0) throw new DomainError("CONFLICT", "Esta fecha tiene pedidos: ciérrala en lugar de borrarla para conservar el historial.");
  await db.delete(deliverySlots).where(eq(deliverySlots.id, slotId));
}

export async function listSlotsForAdmin(db: DbExecutor, now = new Date()) {
  const columns = { slot: deliverySlots, reserved: reservedUnitsSql };
  const upcoming = await db
    .select(columns)
    .from(deliverySlots)
    .where(gte(deliverySlots.endsAt, now))
    .orderBy(asc(deliverySlots.startsAt))
    .limit(30);
  const past = await db
    .select(columns)
    .from(deliverySlots)
    .where(lt(deliverySlots.endsAt, now))
    .orderBy(desc(deliverySlots.startsAt))
    .limit(30);
  return { upcoming, past };
}

export async function getSlotForAdmin(db: DbExecutor, slotId: string) {
  const [row] = await db.select({ slot: deliverySlots, reserved: reservedUnitsSql }).from(deliverySlots).where(eq(deliverySlots.id, slotId));
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Reglas semanales
// ---------------------------------------------------------------------------

export const ruleInputSchema = z.object({
  name: z.string().trim().min(2, { error: "Ponle un nombre." }).max(60, { error: "Máximo 60 caracteres." }),
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: time,
  endTime: time,
  capacity: capacity.refine((value) => value > 0, { error: "Debe ser mayor que cero." }),
  openDaysBefore: z.coerce.number().int().min(0, { error: "Mínimo 0." }).max(13, { error: "Máximo 13 días." }),
  openTime: time,
  closeDaysBefore: z.coerce.number().int().min(0, { error: "Mínimo 0." }).max(13, { error: "Máximo 13 días." }),
  closeTime: time,
  weeksAhead: z.coerce.number().int().min(1, { error: "Mínimo 1." }).max(8, { error: "Máximo 8." }),
  active: z.boolean(),
});

export type RuleInput = z.input<typeof ruleInputSchema>;

function checkedRule(input: RuleInput) {
  const data = parseOrThrow(ruleInputSchema, input);
  if (data.openDaysBefore < data.closeDaysBefore) {
    throw new DomainError("VALIDATION", "La apertura debe ser antes del cierre.", { fields: { openDaysBefore: "Debe ser igual o mayor que los días del cierre." } });
  }
  const problems = validateRuleTiming(data);
  if (problems.length) throw new DomainError("VALIDATION", problems[0]);
  return data;
}

export async function createRule(db: DbExecutor, input: RuleInput) {
  const data = checkedRule(input);
  const [rule] = await db.insert(deliveryRules).values(data).returning();
  return rule;
}

/** Los cambios aplican a las fechas que se generen desde ahora; las ya publicadas se editan aparte. */
export async function updateRule(db: DbExecutor, ruleId: string, input: RuleInput) {
  const data = checkedRule(input);
  const [rule] = await db.update(deliveryRules).set({ ...data, updatedAt: new Date() }).where(eq(deliveryRules.id, ruleId)).returning();
  if (!rule) throw new DomainError("NOT_FOUND", "La regla no existe.");
  return rule;
}

export async function listRules(db: DbExecutor) {
  return db.select().from(deliveryRules).orderBy(asc(deliveryRules.createdAt));
}
