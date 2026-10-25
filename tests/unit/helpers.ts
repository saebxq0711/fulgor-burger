import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { deliverySlots, products, settings } from "@/server/db/schema";
import { resetScheduleThrottle } from "@/server/services/schedule";
import { getSettings } from "@/server/services/settings";

export const db = () => getDb();

/** Deja la base de pruebas vacía (conserva el esquema) y la configuración por defecto. */
export async function resetDatabase() {
  await db().execute(sql`
    TRUNCATE order_events, order_items, orders, delivery_slots, delivery_rules, products,
      admin_sessions, admin_users, rate_limits, media RESTART IDENTITY CASCADE
  `);
  // TRUNCATE … CASCADE también vacía settings (referencia a media): se recrea la fila única.
  await getSettings(db());
  await db()
    .update(settings)
    .set({
      businessName: "Fulgor Burger",
      initialOrderStatus: "pending",
      maxUnitsPerOrder: 6,
      requireAddress: false,
      ordersPaused: false,
      pausedMessage: null,
      whatsappNumber: null,
      logoId: null,
    })
    .where(sql`id = 1`);
  resetScheduleThrottle();
}

export async function makeProduct(overrides: Partial<typeof products.$inferInsert> = {}) {
  const [product] = await db()
    .insert(products)
    .values({ slug: `p-${randomUUID().slice(0, 8)}`, name: "Fulgor Clásica", description: "", priceCop: 28000, ...overrides })
    .returning();
  return product;
}

const HOUR = 3600 * 1000;

/** Fecha abierta: entrega en 3 días, cierra en 2 días. */
export async function makeSlot(overrides: Partial<typeof deliverySlots.$inferInsert> = {}, now = new Date()) {
  const startsAt = new Date(now.getTime() + 72 * HOUR);
  const [slot] = await db()
    .insert(deliverySlots)
    .values({
      deliveryDate: startsAt.toISOString().slice(0, 10),
      startsAt,
      endsAt: new Date(startsAt.getTime() + 6 * HOUR),
      closesAt: new Date(now.getTime() + 48 * HOUR),
      opensAt: null,
      capacity: 20,
      status: "open",
      ...overrides,
    })
    .returning();
  return slot;
}

let phoneCounter = 0;

/** Celular colombiano válido y distinto en cada llamada. */
export function nextPhone() {
  phoneCounter++;
  return `300${String(1000000 + phoneCounter).slice(-7)}`;
}

export function orderInput(slotId: string, productId: string, quantity = 1, overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: randomUUID(),
    slotId,
    items: [{ productId, quantity }],
    name: "Laura Gómez",
    phone: nextPhone(),
    ...overrides,
  };
}
