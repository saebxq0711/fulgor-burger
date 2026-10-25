import "server-only";
import { randomInt } from "node:crypto";
import { and, count, desc, eq, gte, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import type { Database, DbExecutor } from "../db/client";
import {
  deliverySlots,
  orderEvents,
  orderItems,
  orders,
  products,
  type DeliverySlot,
  type Order,
  type OrderStatus,
} from "../db/schema";
import { DomainError, pgErrorOf } from "../errors";
import { anonymize, sha256Hex } from "../secrets";
import { createOrderSchema, fieldErrors } from "@/lib/validation";
import { CONSUMING_STATUSES, slotState } from "./availability";
import { hitRateLimit } from "./rate-limit";
import { getSettings } from "./settings";

/** Intentos de creación por cliente (IP anonimizada) en la ventana. */
export const ORDER_ATTEMPTS_PER_CLIENT = 12;
export const ORDER_ATTEMPTS_WINDOW_SECONDS = 10 * 60;
/** Pedidos activos máximos por número de WhatsApp en 24 horas. */
export const ORDERS_PER_PHONE_PER_DAY = 6;

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateOrderCode(): string {
  let code = "";
  for (let i = 0; i < 7; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `FB-${code}`;
}

export type OrderReceipt = {
  code: string;
  status: OrderStatus;
  customerName: string;
  slot: { deliveryDate: string; label: string | null; startsAt: string; endsAt: string };
  items: { name: string; quantity: number; unitPriceCop: number; lineTotalCop: number }[];
  totalUnits: number;
  totalCop: number;
  createdAt: string;
};

export type CreateOrderResult = { receipt: OrderReceipt; replayed: boolean };

type CreateOrderContext = {
  now?: Date;
  /** Identificador del cliente (p. ej. la IP) para limitar abuso; se anonimiza antes de guardar. */
  clientId?: string;
};

function requestFingerprint(data: {
  slotId: string;
  items: { productId: string; quantity: number }[];
  name: string;
  phone: string;
  address?: string;
}): string {
  const items = [...data.items].sort((a, b) => a.productId.localeCompare(b.productId));
  return sha256Hex(JSON.stringify([data.slotId, items, data.name, data.phone, data.address ?? ""]));
}

async function lockSlot(tx: DbExecutor, slotId: string): Promise<DeliverySlot | undefined> {
  const [slot] = await tx.select().from(deliverySlots).where(eq(deliverySlots.id, slotId)).for("update");
  return slot;
}

async function reservedUnitsLocked(tx: DbExecutor, slotId: string): Promise<number> {
  const [row] = await tx
    .select({ total: sql<number>`COALESCE(SUM(${orders.totalUnits}), 0)::int` })
    .from(orders)
    .where(and(eq(orders.slotId, slotId), inArray(orders.status, [...CONSUMING_STATUSES])));
  return row?.total ?? 0;
}

async function buildReceipt(db: DbExecutor, order: Order): Promise<OrderReceipt> {
  const [slot] = await db.select().from(deliverySlots).where(eq(deliverySlots.id, order.slotId));
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return {
    code: order.code,
    status: order.status,
    customerName: order.customerName,
    slot: {
      deliveryDate: slot.deliveryDate,
      label: slot.label,
      startsAt: slot.startsAt.toISOString(),
      endsAt: slot.endsAt.toISOString(),
    },
    items: items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      unitPriceCop: item.unitPriceCop,
      lineTotalCop: item.lineTotalCop,
    })),
    totalUnits: order.totalUnits,
    totalCop: order.totalCop,
    createdAt: order.createdAt.toISOString(),
  };
}

async function findByIdempotencyKey(db: DbExecutor, key: string) {
  const [order] = await db.select().from(orders).where(eq(orders.idempotencyKey, key));
  return order;
}

async function replayOrConflict(db: DbExecutor, order: Order, hash: string): Promise<CreateOrderResult> {
  if (order.requestHash !== hash) {
    throw new DomainError(
      "IDEMPOTENCY_CONFLICT",
      "Esta solicitud ya se usó para otro pedido. Recarga la página e inténtalo de nuevo.",
    );
  }
  return { receipt: await buildReceipt(db, order), replayed: true };
}

/**
 * Crea un pedido público. Toda la validación ocurre aquí: precios, cupos, fechas y datos.
 *
 * Concurrencia: la fila de la fecha se bloquea con SELECT … FOR UPDATE, de modo que dos
 * pedidos para la misma fecha se procesan uno detrás del otro. Además, un trigger en la base
 * rechaza cualquier escritura que supere la capacidad (defensa en profundidad).
 *
 * Idempotencia: el navegador envía una clave única por intento de compra. Un reintento con la
 * misma clave devuelve el mismo pedido sin volver a descontar cupo.
 */
export async function createOrder(db: Database, rawInput: unknown, ctx: CreateOrderContext = {}): Promise<CreateOrderResult> {
  const now = ctx.now ?? new Date();
  const parsed = createOrderSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new DomainError("VALIDATION", "Revisa los datos del pedido.", { fields: fieldErrors(parsed.error) });
  }
  const data = parsed.data;
  if (data.website && data.website.trim() !== "") {
    throw new DomainError("VALIDATION", "No pudimos procesar el pedido.");
  }
  const hash = requestFingerprint(data);

  // Reintento de una solicitud ya procesada: se responde sin contar contra los límites.
  const previous = await findByIdempotencyKey(db, data.idempotencyKey);
  if (previous) return replayOrConflict(db, previous, hash);

  if (ctx.clientId) {
    const limit = await hitRateLimit(
      db,
      `order:client:${anonymize(ctx.clientId)}`,
      ORDER_ATTEMPTS_PER_CLIENT,
      ORDER_ATTEMPTS_WINDOW_SECONDS,
      now,
    );
    if (!limit.allowed) {
      throw new DomainError("RATE_LIMITED", "Demasiados intentos seguidos. Espera unos minutos e inténtalo de nuevo.", {
        retryAfterSeconds: limit.retryAfterSeconds,
      });
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        const settingsRow = await getSettings(tx);
        if (settingsRow.ordersPaused) {
          throw new DomainError(
            "ORDERS_PAUSED",
            settingsRow.pausedMessage || "Los pedidos están en pausa por ahora. Vuelve a intentarlo más tarde.",
          );
        }

        const slot = await lockSlot(tx, data.slotId);
        if (!slot) throw new DomainError("SLOT_NOT_FOUND", "Ese día de entrega ya no está disponible. Elige otro.");

        // Con la fecha bloqueada, comprobamos de nuevo la clave (reintentos simultáneos).
        const concurrent = await findByIdempotencyKey(tx, data.idempotencyKey);
        if (concurrent) return replayOrConflict(tx, concurrent, hash);

        const reserved = await reservedUnitsLocked(tx, slot.id);
        const state = slotState(slot, reserved, now);
        if (state === "closed" || state === "paused") {
          throw new DomainError("SLOT_CLOSED", "Ese día de entrega ya no recibe pedidos. Elige otro.");
        }
        if (state === "upcoming") {
          throw new DomainError("SLOT_NOT_OPEN_YET", "Ese día todavía no abre para pedidos.", {
            opensAt: slot.opensAt?.toISOString(),
          });
        }

        const productIds = data.items.map((item) => item.productId);
        const catalog = await tx
          .select()
          .from(products)
          .where(and(inArray(products.id, productIds), eq(products.active, true)));
        if (catalog.length !== productIds.length) {
          throw new DomainError("PRODUCT_UNAVAILABLE", "Uno de los productos ya no está disponible. Recarga la página.");
        }
        const byId = new Map(catalog.map((product) => [product.id, product]));

        const lines = data.items.map((item) => {
          const product = byId.get(item.productId)!;
          if (product.maxPerOrder && item.quantity > product.maxPerOrder) {
            throw new DomainError("TOO_MANY_UNITS", `Puedes pedir máximo ${product.maxPerOrder} de ${product.name}.`, {
              max: product.maxPerOrder,
            });
          }
          return {
            productId: product.id,
            productName: product.name,
            unitPriceCop: product.priceCop,
            quantity: item.quantity,
            lineTotalCop: product.priceCop * item.quantity,
          };
        });

        const totalUnits = lines.reduce((sum, line) => sum + line.quantity, 0);
        const totalCop = lines.reduce((sum, line) => sum + line.lineTotalCop, 0);

        if (totalUnits > settingsRow.maxUnitsPerOrder) {
          throw new DomainError("TOO_MANY_UNITS", `Puedes pedir máximo ${settingsRow.maxUnitsPerOrder} unidades por pedido.`, {
            max: settingsRow.maxUnitsPerOrder,
          });
        }

        const remaining = slot.capacity - reserved;
        if (totalUnits > remaining) {
          throw new DomainError(
            "SOLD_OUT",
            remaining > 0
              ? `Solo quedan ${remaining} para ese día. Ajusta la cantidad o elige otra fecha.`
              : "Se agotaron los cupos de ese día justo ahora. Elige otra fecha.",
            { remaining: Math.max(0, remaining) },
          );
        }

        if (settingsRow.requireAddress && !data.address) {
          throw new DomainError("VALIDATION", "Revisa los datos del pedido.", {
            fields: { address: "Escribe la dirección de entrega." },
          });
        }

        const [{ value: recentByPhone }] = await tx
          .select({ value: count() })
          .from(orders)
          .where(
            and(
              eq(orders.customerPhone, data.phone),
              gte(orders.createdAt, new Date(now.getTime() - 24 * 3600 * 1000)),
              inArray(orders.status, [...CONSUMING_STATUSES]),
            ),
          );
        if (recentByPhone >= ORDERS_PER_PHONE_PER_DAY) {
          throw new DomainError("RATE_LIMITED", "Este número ya tiene muchos pedidos hoy. Escríbenos por WhatsApp si necesitas más.");
        }

        const [order] = await tx
          .insert(orders)
          .values({
            code: generateOrderCode(),
            slotId: slot.id,
            customerName: data.name,
            customerPhone: data.phone,
            deliveryAddress: settingsRow.requireAddress ? data.address || null : null,
            status: settingsRow.initialOrderStatus,
            totalUnits,
            totalCop,
            idempotencyKey: data.idempotencyKey,
            requestHash: hash,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        await tx.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order.id })));
        await tx.insert(orderEvents).values({ orderId: order.id, fromStatus: null, toStatus: order.status, createdAt: now });

        return { receipt: await buildReceipt(tx, order), replayed: false };
      });
    } catch (error) {
      const pg = pgErrorOf(error);
      if (pg?.code === "23505" && pg.constraint === "orders_code_key") continue; // código repetido: reintenta
      if (pg?.code === "23505" && pg.constraint === "orders_idempotency_key") {
        const existing = await findByIdempotencyKey(db, data.idempotencyKey);
        if (existing) return replayOrConflict(db, existing, hash);
      }
      if (pg?.code === "P0001" && pg.message?.includes("SLOT_CAPACITY_EXCEEDED")) {
        throw new DomainError("SOLD_OUT", "Se agotaron los cupos de ese día justo ahora. Elige otra fecha.", { remaining: 0 });
      }
      throw error;
    }
  }
  throw new DomainError("CONFLICT", "No pudimos registrar el pedido. Inténtalo de nuevo.");
}

// ---------------------------------------------------------------------------
// Administración de pedidos
// ---------------------------------------------------------------------------

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Agendado",
  confirmed: "Confirmado",
  fulfilled: "Entregado",
  cancelled: "Cancelado",
};

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "fulfilled", "cancelled"],
  confirmed: ["pending", "fulfilled", "cancelled"],
  fulfilled: ["confirmed"],
  cancelled: ["pending", "confirmed"],
};

export function allowedTransitions(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from];
}

/**
 * Cambia el estado de un pedido. Cancelar libera el cupo (deja de contarse); hacerlo dos veces
 * no libera nada más. Reactivar un cancelado vuelve a comprobar la capacidad bajo bloqueo.
 */
export async function changeOrderStatus(
  db: Database,
  input: { orderId: string; to: OrderStatus; actorId: string | null; note?: string },
  now = new Date(),
): Promise<{ changed: boolean; order: Order }> {
  return db.transaction(async (tx) => {
    const [current] = await tx.select({ slotId: orders.slotId }).from(orders).where(eq(orders.id, input.orderId));
    if (!current) throw new DomainError("NOT_FOUND", "El pedido no existe.");

    // Mismo orden de bloqueo que al crear pedidos (fecha → pedido) para evitar interbloqueos.
    const slot = await lockSlot(tx, current.slotId);
    const [order] = await tx.select().from(orders).where(eq(orders.id, input.orderId)).for("update");
    if (!slot || !order) throw new DomainError("NOT_FOUND", "El pedido no existe.");

    if (order.status === input.to) return { changed: false, order };
    if (!TRANSITIONS[order.status].includes(input.to)) {
      throw new DomainError(
        "INVALID_TRANSITION",
        `No se puede pasar de ${ORDER_STATUS_LABELS[order.status]} a ${ORDER_STATUS_LABELS[input.to]}.`,
      );
    }

    if (order.status === "cancelled") {
      const reserved = await reservedUnitsLocked(tx, slot.id);
      if (reserved + order.totalUnits > slot.capacity) {
        throw new DomainError(
          "SOLD_OUT",
          `No hay cupo para reactivarlo: quedan ${Math.max(0, slot.capacity - reserved)} y el pedido tiene ${order.totalUnits}.`,
        );
      }
    }

    try {
      const [updated] = await tx
        .update(orders)
        .set({ status: input.to, updatedAt: now })
        .where(eq(orders.id, order.id))
        .returning();
      await tx.insert(orderEvents).values({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: input.to,
        actorId: input.actorId,
        note: input.note?.slice(0, 200) || null,
        createdAt: now,
      });
      return { changed: true, order: updated };
    } catch (error) {
      const pg = pgErrorOf(error);
      if (pg?.code === "P0001" && pg.message?.includes("SLOT_CAPACITY_EXCEEDED")) {
        throw new DomainError("SOLD_OUT", "No hay cupo suficiente para ese cambio.");
      }
      throw error;
    }
  });
}

export async function updateOrderNotes(db: Database, orderId: string, notes: string) {
  const [updated] = await db
    .update(orders)
    .set({ adminNotes: notes.trim().slice(0, 1000) || null, updatedAt: new Date() })
    .where(eq(orders.id, orderId))
    .returning({ id: orders.id });
  if (!updated) throw new DomainError("NOT_FOUND", "El pedido no existe.");
}

export type OrderFilters = {
  slotId?: string;
  status?: OrderStatus;
  q?: string;
};

function filterConditions(filters: OrderFilters): SQL | undefined {
  const conditions: SQL[] = [];
  if (filters.slotId) conditions.push(eq(orders.slotId, filters.slotId));
  if (filters.status) conditions.push(eq(orders.status, filters.status));
  const q = filters.q?.trim();
  if (q) {
    const escaped = q.replace(/[\\%_]/g, (char) => `\\${char}`);
    const digits = q.replace(/\D/g, "");
    const options: SQL[] = [ilike(orders.customerName, `%${escaped}%`), ilike(orders.code, `%${escaped}%`)];
    if (digits.length >= 3) options.push(ilike(orders.customerPhone, `%${digits}%`));
    conditions.push(or(...options)!);
  }
  return conditions.length ? and(...conditions) : undefined;
}

export const ORDERS_PAGE_SIZE = 40;

export async function listOrders(db: DbExecutor, filters: OrderFilters, page = 1) {
  const where = filterConditions(filters);
  const offset = (Math.max(1, page) - 1) * ORDERS_PAGE_SIZE;
  const rows = await db
    .select({ order: orders, slot: deliverySlots })
    .from(orders)
    .innerJoin(deliverySlots, eq(orders.slotId, deliverySlots.id))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(ORDERS_PAGE_SIZE)
    .offset(offset);
  const [{ value: total }] = await db.select({ value: count() }).from(orders).where(where);
  return { rows, total, page: Math.max(1, page), pageSize: ORDERS_PAGE_SIZE };
}

export async function getOrderDetail(db: DbExecutor, orderId: string) {
  const [row] = await db
    .select({ order: orders, slot: deliverySlots })
    .from(orders)
    .innerJoin(deliverySlots, eq(orders.slotId, deliverySlots.id))
    .where(eq(orders.id, orderId));
  if (!row) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const events = await db
    .select()
    .from(orderEvents)
    .where(eq(orderEvents.orderId, orderId))
    .orderBy(desc(orderEvents.createdAt));
  return { ...row, items, events };
}

/** Todas las filas que cumplen el filtro, con sus ítems, para exportar. */
export async function ordersForExport(db: DbExecutor, filters: OrderFilters) {
  const rows = await db
    .select({ order: orders, slot: deliverySlots })
    .from(orders)
    .innerJoin(deliverySlots, eq(orders.slotId, deliverySlots.id))
    .where(filterConditions(filters))
    .orderBy(desc(deliverySlots.startsAt), desc(orders.createdAt))
    .limit(10_000);
  const ids = rows.map((row) => row.order.id);
  const items = ids.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, ids)) : [];
  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const list = itemsByOrder.get(item.orderId) ?? [];
    list.push(item);
    itemsByOrder.set(item.orderId, list);
  }
  return rows.map((row) => ({ ...row, items: itemsByOrder.get(row.order.id) ?? [] }));
}
