import "server-only";
import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import type { DbExecutor } from "../db/client";
import { deliverySlots, products, type DeliverySlot } from "../db/schema";
import { capitalize, formatDay, formatDayTime, formatShortDay, formatWindow } from "@/lib/time";

/** Estados de pedido que ocupan cupo. Cancelado no cuenta. */
export const CONSUMING_STATUSES = ["pending", "confirmed", "fulfilled"] as const;

export type SlotAvailabilityState = "open" | "soldout" | "paused" | "upcoming" | "closed";

export type PublicSlot = {
  id: string;
  deliveryDate: string;
  label: string | null;
  startsAt: string;
  endsAt: string;
  opensAt: string | null;
  closesAt: string;
  capacity: number;
  remaining: number;
  state: SlotAvailabilityState;
  /** Textos ya formateados en hora de Bogotá (servidor y navegador muestran lo mismo). */
  text: SlotText;
};

export type SlotText = {
  /** "Domingo, 1 de noviembre" o el nombre especial de la fecha. */
  title: string;
  /** "Domingo, 1 de noviembre" (siempre la fecha, aunque tenga nombre especial). */
  day: string;
  /** "Dom, 1 de nov" */
  shortDay: string;
  /** "12:00 p. m. – 6:00 p. m." */
  window: string;
  /** "Sábado, 31 de octubre, 8:00 p. m." */
  closes: string;
  opens: string | null;
};

export function slotText(slot: Pick<DeliverySlot, "label" | "startsAt" | "endsAt" | "closesAt" | "opensAt">): SlotText {
  const day = capitalize(formatDay(slot.startsAt));
  return {
    title: slot.label || day,
    day,
    shortDay: capitalize(formatShortDay(slot.startsAt)),
    window: formatWindow(slot.startsAt, slot.endsAt),
    closes: capitalize(formatDayTime(slot.closesAt)),
    opens: slot.opensAt ? capitalize(formatDayTime(slot.opensAt)) : null,
  };
}

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCop: number;
  imageUrl: string | null;
  imageAlt: string;
  maxPerOrder: number | null;
};

/**
 * Subconsulta correlacionada: unidades que ocupan cupo en la fecha de la fila actual.
 * Los nombres van calificados a mano porque drizzle omite el prefijo de tabla en consultas
 * de una sola tabla, y sin él "id" se resolvería contra orders.
 */
const OUTER_SLOT_ID = sql.raw(`"delivery_slots"."id"`);

export const reservedUnitsSql = sql<number>`COALESCE((
  SELECT SUM(o.total_units) FROM orders o
  WHERE o.slot_id = ${OUTER_SLOT_ID}
    AND o.status IN ('pending', 'confirmed', 'fulfilled')
), 0)::int`;

/** Total en COP de los pedidos que ocupan cupo en la fecha de la fila actual. */
export const reservedRevenueSql = sql<number>`COALESCE((
  SELECT SUM(o.total_cop) FROM orders o
  WHERE o.slot_id = ${OUTER_SLOT_ID}
    AND o.status IN ('pending', 'confirmed', 'fulfilled')
), 0)::int`;

/** Número de pedidos que ocupan cupo en la fecha de la fila actual. */
export const activeOrderCountSql = sql<number>`(
  SELECT COUNT(*) FROM orders o
  WHERE o.slot_id = ${OUTER_SLOT_ID}
    AND o.status IN ('pending', 'confirmed', 'fulfilled')
)::int`;

export function slotState(
  slot: Pick<DeliverySlot, "status" | "opensAt" | "closesAt" | "startsAt" | "capacity">,
  reserved: number,
  now: Date,
): SlotAvailabilityState {
  if (slot.status === "closed" || slot.closesAt <= now || slot.startsAt <= now) return "closed";
  if (slot.status === "paused") return "paused";
  if (slot.opensAt && slot.opensAt > now) return "upcoming";
  if (slot.capacity - reserved <= 0) return "soldout";
  return "open";
}

/** Unidades reservadas de una fecha (lectura simple, sin bloqueo). */
export async function getReservedUnits(db: DbExecutor, slotId: string): Promise<number> {
  const [row] = await db
    .select({ reserved: reservedUnitsSql })
    .from(deliverySlots)
    .where(eq(deliverySlots.id, slotId));
  return row?.reserved ?? 0;
}

/** Fechas visibles al público: no cerradas, futuras, ordenadas. Sin datos personales. */
export async function getPublicSlots(db: DbExecutor, now = new Date(), limit = 6): Promise<PublicSlot[]> {
  const rows = await db
    .select({ slot: deliverySlots, reserved: reservedUnitsSql })
    .from(deliverySlots)
    .where(
      and(
        inArray(deliverySlots.status, ["open", "paused"]),
        gt(deliverySlots.closesAt, now),
        gt(deliverySlots.startsAt, now),
      ),
    )
    .orderBy(asc(deliverySlots.startsAt))
    .limit(limit);

  return rows.map(({ slot, reserved }) => ({
    id: slot.id,
    deliveryDate: slot.deliveryDate,
    label: slot.label,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    opensAt: slot.opensAt ? slot.opensAt.toISOString() : null,
    closesAt: slot.closesAt.toISOString(),
    capacity: slot.capacity,
    remaining: Math.max(0, slot.capacity - reserved),
    state: slotState(slot, reserved, now),
    text: slotText(slot),
  }));
}

export async function getPublicProducts(db: DbExecutor): Promise<PublicProduct[]> {
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.active, true))
    .orderBy(asc(products.sortOrder), asc(products.createdAt));
  return rows.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    priceCop: product.priceCop,
    imageUrl: product.imageId ? `/media/${product.imageId}` : null,
    imageAlt: product.imageAlt,
    maxPerOrder: product.maxPerOrder,
  }));
}
