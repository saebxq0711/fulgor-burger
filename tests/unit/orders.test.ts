import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { orderItems, orders, settings } from "@/server/db/schema";
import { DomainError } from "@/server/errors";
import { getReservedUnits } from "@/server/services/availability";
import { changeOrderStatus, createOrder } from "@/server/services/orders";
import { db, makeProduct, makeSlot, nextPhone, orderInput, resetDatabase } from "./helpers";

async function expectDomainError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error, `se esperaba el error ${code}`).toBeInstanceOf(DomainError);
  expect((error as DomainError).code).toBe(code);
  return error as DomainError;
}

beforeEach(resetDatabase);

describe("reserva válida", () => {
  it("descuenta exactamente la cantidad pedida y devuelve un código", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 20 });

    const { receipt, replayed } = await createOrder(db(), orderInput(slot.id, product.id, 3));

    expect(replayed).toBe(false);
    expect(receipt.code).toMatch(/^FB-[2-9A-HJ-NP-Z]{7}$/);
    expect(receipt.totalUnits).toBe(3);
    expect(await getReservedUnits(db(), slot.id)).toBe(3);
  });

  it("calcula el precio en el servidor e ignora precios enviados por el navegador", async () => {
    const product = await makeProduct({ priceCop: 31500 });
    const slot = await makeSlot();
    const input = {
      ...orderInput(slot.id, product.id, 2),
      totalCop: 1,
      items: [{ productId: product.id, quantity: 2, priceCop: 1, unitPriceCop: 1 }],
    };

    const { receipt } = await createOrder(db(), input);

    expect(receipt.totalCop).toBe(63000);
    expect(receipt.items[0]).toMatchObject({ unitPriceCop: 31500, lineTotalCop: 63000 });
    const [stored] = await db().select().from(orderItems);
    expect(stored.unitPriceCop).toBe(31500);
  });

  it("guarda el teléfono normalizado en formato internacional", async () => {
    const product = await makeProduct();
    const slot = await makeSlot();
    await createOrder(db(), orderInput(slot.id, product.id, 1, { phone: "300 765 4321" }));
    const [order] = await db().select().from(orders);
    expect(order.customerPhone).toBe("+573007654321");
  });

  it("nace con el estado configurado (agendado por defecto)", async () => {
    const product = await makeProduct();
    const slot = await makeSlot();
    const first = await createOrder(db(), orderInput(slot.id, product.id));
    expect(first.receipt.status).toBe("pending");

    await db().update(settings).set({ initialOrderStatus: "confirmed" }).where(sql`id = 1`);
    const second = await createOrder(db(), orderInput(slot.id, product.id));
    expect(second.receipt.status).toBe("confirmed");
  });
});

describe("concurrencia y capacidad", () => {
  it("dos solicitudes simultáneas por el último cupo: solo una se completa", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 1 });

    const results = await Promise.allSettled([
      createOrder(db(), orderInput(slot.id, product.id, 1)),
      createOrder(db(), orderInput(slot.id, product.id, 1)),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(DomainError);
    expect((rejected[0].reason as DomainError).code).toBe("SOLD_OUT");
    expect(await getReservedUnits(db(), slot.id)).toBe(1);
  });

  it("40 pedidos simultáneos sobre 20 cupos: se venden exactamente 20", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 20 });

    const results = await Promise.allSettled(
      Array.from({ length: 40 }, () => createOrder(db(), orderInput(slot.id, product.id, 1))),
    );

    const sold = results.filter((r) => r.status === "fulfilled").length;
    expect(sold).toBe(20);
    for (const result of results) {
      if (result.status === "rejected") expect((result.reason as DomainError).code).toBe("SOLD_OUT");
    }
    expect(await getReservedUnits(db(), slot.id)).toBe(20);
  });

  it("no permite pedir más unidades de las que quedan", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 5 });
    await createOrder(db(), orderInput(slot.id, product.id, 3));

    const error = await expectDomainError(createOrder(db(), orderInput(slot.id, product.id, 3)), "SOLD_OUT");
    expect(error.details.remaining).toBe(2);
    expect(await getReservedUnits(db(), slot.id)).toBe(3);

    await createOrder(db(), orderInput(slot.id, product.id, 2));
    expect(await getReservedUnits(db(), slot.id)).toBe(5);
  });

  it("respeta el máximo de unidades por pedido configurable", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 50 });
    await db().update(settings).set({ maxUnitsPerOrder: 4 }).where(sql`id = 1`);
    await expectDomainError(createOrder(db(), orderInput(slot.id, product.id, 5)), "TOO_MANY_UNITS");
    await createOrder(db(), orderInput(slot.id, product.id, 4));
  });

  it("la base de datos rechaza por sí misma una escritura que supere la capacidad", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 2 });
    await createOrder(db(), orderInput(slot.id, product.id, 2));

    // Escritura directa que se salta el servicio: el trigger debe impedirla.
    const direct = db()
      .insert(orders)
      .values({
        code: "FB-DIRECTO",
        slotId: slot.id,
        customerName: "Prueba",
        customerPhone: "+573000000000",
        status: "confirmed",
        totalUnits: 1,
        totalCop: 1,
        idempotencyKey: randomUUID(),
        requestHash: "x",
      });
    await expect(direct).rejects.toThrow();
    expect(await getReservedUnits(db(), slot.id)).toBe(2);
  });
});

describe("fechas no disponibles", () => {
  it("rechaza una fecha cuyo cierre ya pasó", async () => {
    const product = await makeProduct();
    const now = new Date();
    const slot = await makeSlot({ closesAt: new Date(now.getTime() - 60_000) });
    await expectDomainError(createOrder(db(), orderInput(slot.id, product.id)), "SLOT_CLOSED");
  });

  it("rechaza una fecha cuya entrega ya ocurrió", async () => {
    const product = await makeProduct();
    const now = new Date();
    const slot = await makeSlot({
      deliveryDate: "2026-01-04",
      startsAt: new Date(now.getTime() - 48 * 3600_000),
      endsAt: new Date(now.getTime() - 42 * 3600_000),
      closesAt: new Date(now.getTime() - 60 * 3600_000),
    });
    await expectDomainError(createOrder(db(), orderInput(slot.id, product.id)), "SLOT_CLOSED");
  });

  it("rechaza fechas cerradas o pausadas por el administrador", async () => {
    const product = await makeProduct();
    const closed = await makeSlot({ status: "closed" });
    const paused = await makeSlot({ status: "paused" });
    await expectDomainError(createOrder(db(), orderInput(closed.id, product.id)), "SLOT_CLOSED");
    await expectDomainError(createOrder(db(), orderInput(paused.id, product.id)), "SLOT_CLOSED");
  });

  it("rechaza una fecha que aún no abre", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ opensAt: new Date(Date.now() + 3600_000) });
    await expectDomainError(createOrder(db(), orderInput(slot.id, product.id)), "SLOT_NOT_OPEN_YET");
  });

  it("rechaza una fecha agotada", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 1 });
    await createOrder(db(), orderInput(slot.id, product.id));
    await expectDomainError(createOrder(db(), orderInput(slot.id, product.id)), "SOLD_OUT");
  });

  it("rechaza todo cuando los pedidos están en pausa general", async () => {
    const product = await makeProduct();
    const slot = await makeSlot();
    await db().update(settings).set({ ordersPaused: true, pausedMessage: "Volvemos pronto." }).where(sql`id = 1`);
    const error = await expectDomainError(createOrder(db(), orderInput(slot.id, product.id)), "ORDERS_PAUSED");
    expect(error.message).toBe("Volvemos pronto.");
  });

  it("rechaza productos desactivados", async () => {
    const product = await makeProduct({ active: false });
    const slot = await makeSlot();
    await expectDomainError(createOrder(db(), orderInput(slot.id, product.id)), "PRODUCT_UNAVAILABLE");
  });
});

describe("cancelaciones", () => {
  it("cancelar libera el cupo una sola vez", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 10 });
    const { receipt } = await createOrder(db(), orderInput(slot.id, product.id, 4));
    const [order] = await db().select().from(orders).where(eq(orders.code, receipt.code));
    expect(await getReservedUnits(db(), slot.id)).toBe(4);

    const first = await changeOrderStatus(db(), { orderId: order.id, to: "cancelled", actorId: null });
    const second = await changeOrderStatus(db(), { orderId: order.id, to: "cancelled", actorId: null });

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(await getReservedUnits(db(), slot.id)).toBe(0);
  });

  it("cancelaciones simultáneas del mismo pedido liberan el cupo una sola vez", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 10 });
    await createOrder(db(), orderInput(slot.id, product.id, 2));
    const { receipt } = await createOrder(db(), orderInput(slot.id, product.id, 3));
    const [order] = await db().select().from(orders).where(eq(orders.code, receipt.code));

    const results = await Promise.all(
      Array.from({ length: 5 }, () => changeOrderStatus(db(), { orderId: order.id, to: "cancelled", actorId: null })),
    );
    expect(results.filter((r) => r.changed)).toHaveLength(1);
    expect(await getReservedUnits(db(), slot.id)).toBe(2);
  });

  it("el cupo liberado puede volver a venderse", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 1 });
    const { receipt } = await createOrder(db(), orderInput(slot.id, product.id));
    const [order] = await db().select().from(orders).where(eq(orders.code, receipt.code));
    await changeOrderStatus(db(), { orderId: order.id, to: "cancelled", actorId: null });

    await createOrder(db(), orderInput(slot.id, product.id));
    expect(await getReservedUnits(db(), slot.id)).toBe(1);
  });

  it("no reactiva un pedido cancelado si ya no hay cupo", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 2 });
    const { receipt } = await createOrder(db(), orderInput(slot.id, product.id, 2));
    const [order] = await db().select().from(orders).where(eq(orders.code, receipt.code));
    await changeOrderStatus(db(), { orderId: order.id, to: "cancelled", actorId: null });
    await createOrder(db(), orderInput(slot.id, product.id, 1));

    await expectDomainError(changeOrderStatus(db(), { orderId: order.id, to: "confirmed", actorId: null }), "SOLD_OUT");
    expect(await getReservedUnits(db(), slot.id)).toBe(1);
  });

  it("registra cada cambio de estado en el historial del pedido", async () => {
    const product = await makeProduct();
    const slot = await makeSlot();
    const { receipt } = await createOrder(db(), orderInput(slot.id, product.id));
    const [order] = await db().select().from(orders).where(eq(orders.code, receipt.code));
    await changeOrderStatus(db(), { orderId: order.id, to: "confirmed", actorId: null });
    await changeOrderStatus(db(), { orderId: order.id, to: "fulfilled", actorId: null });
    const events = await db().execute(sql`SELECT from_status, to_status FROM order_events WHERE order_id = ${order.id} ORDER BY created_at`);
    expect(events.rows.map((row) => row.to_status)).toEqual(["pending", "confirmed", "fulfilled"]);
    await expectDomainError(changeOrderStatus(db(), { orderId: order.id, to: "cancelled", actorId: null }), "INVALID_TRANSITION");
  });
});

describe("idempotencia", () => {
  it("un reintento con la misma clave no duplica el pedido ni el descuento", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 10 });
    const input = orderInput(slot.id, product.id, 2);

    const first = await createOrder(db(), input);
    const retry = await createOrder(db(), { ...input });

    expect(retry.replayed).toBe(true);
    expect(retry.receipt.code).toBe(first.receipt.code);
    expect(await db().select().from(orders)).toHaveLength(1);
    expect(await getReservedUnits(db(), slot.id)).toBe(2);
  });

  it("reintentos simultáneos (doble clic) crean un solo pedido", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 10 });
    const input = orderInput(slot.id, product.id, 3);

    const results = await Promise.all(Array.from({ length: 4 }, () => createOrder(db(), { ...input })));

    expect(new Set(results.map((r) => r.receipt.code)).size).toBe(1);
    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    expect(await db().select().from(orders)).toHaveLength(1);
    expect(await getReservedUnits(db(), slot.id)).toBe(3);
  });

  it("la misma clave con otro contenido se rechaza", async () => {
    const product = await makeProduct();
    const slot = await makeSlot();
    const input = orderInput(slot.id, product.id, 1);
    await createOrder(db(), input);
    await expectDomainError(createOrder(db(), { ...input, items: [{ productId: product.id, quantity: 2 }] }), "IDEMPOTENCY_CONFLICT");
  });

  it("personas distintas en el mismo dispositivo pueden pedir (claves distintas)", async () => {
    const product = await makeProduct();
    const slot = await makeSlot();
    await createOrder(db(), orderInput(slot.id, product.id, 1, { name: "Ana", phone: nextPhone() }));
    await createOrder(db(), orderInput(slot.id, product.id, 1, { name: "Bruno", phone: nextPhone() }));
    expect(await db().select().from(orders)).toHaveLength(2);
  });
});

describe("validación de nombre y teléfono", () => {
  it.each([
    ["", "name"],
    ["A", "name"],
    ["<script>alert(1)</script>", "name"],
    ["Juan 123", "name"],
    ["x".repeat(61), "name"],
  ])("rechaza el nombre %j", async (name, field) => {
    const product = await makeProduct();
    const slot = await makeSlot();
    const error = await expectDomainError(createOrder(db(), orderInput(slot.id, product.id, 1, { name })), "VALIDATION");
    expect((error.details.fields as Record<string, string>)[field]).toBeTruthy();
  });

  it.each(["123", "abc", "6011234567", "300 123", "+57 300 123 45678", "1".repeat(30)])("rechaza el teléfono %j", async (phone) => {
    const product = await makeProduct();
    const slot = await makeSlot();
    const error = await expectDomainError(createOrder(db(), orderInput(slot.id, product.id, 1, { phone })), "VALIDATION");
    expect((error.details.fields as Record<string, string>).phone).toBeTruthy();
  });

  it.each([
    ["3001234567", "+573001234567"],
    ["300 123 4567", "+573001234567"],
    ["+57 300-123-4567", "+573001234567"],
    ["(300) 123 4567", "+573001234567"],
    ["+34 612 345 678", "+34612345678"],
  ])("acepta %j y lo normaliza", async (phone, expected) => {
    const product = await makeProduct();
    const slot = await makeSlot();
    await createOrder(db(), orderInput(slot.id, product.id, 1, { phone }));
    const [order] = await db().select().from(orders);
    expect(order.customerPhone).toBe(expected);
  });

  it("acepta nombres con tildes, ñ y apellidos compuestos", async () => {
    const product = await makeProduct();
    const slot = await makeSlot();
    await createOrder(db(), orderInput(slot.id, product.id, 1, { name: "  María José   Peña-O’Neill " }));
    const [order] = await db().select().from(orders);
    expect(order.customerName).toBe("María José Peña-O’Neill");
  });

  it("rechaza envíos con el campo trampa lleno (robots)", async () => {
    const product = await makeProduct();
    const slot = await makeSlot();
    await expectDomainError(createOrder(db(), orderInput(slot.id, product.id, 1, { website: "http://spam.example" })), "VALIDATION");
    expect(await db().select().from(orders)).toHaveLength(0);
  });

  it("exige dirección solo si el negocio la pide", async () => {
    const product = await makeProduct();
    const slot = await makeSlot();
    await db().update(settings).set({ requireAddress: true }).where(sql`id = 1`);
    const error = await expectDomainError(createOrder(db(), orderInput(slot.id, product.id)), "VALIDATION");
    expect((error.details.fields as Record<string, string>).address).toBeTruthy();
    await createOrder(db(), orderInput(slot.id, product.id, 1, { address: "Calle 10 # 20-30, apto 401" }));
  });
});

describe("límites contra abuso", () => {
  it("limita los intentos seguidos desde un mismo cliente", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 100 });
    await db().update(settings).set({ maxUnitsPerOrder: 1 }).where(sql`id = 1`);
    const attempts = [];
    for (let i = 0; i < 13; i++) {
      attempts.push(
        await createOrder(db(), orderInput(slot.id, product.id), { clientId: "203.0.113.7" }).then(
          () => "ok",
          (error: DomainError) => error.code,
        ),
      );
    }
    expect(attempts.slice(0, 12).every((r) => r === "ok")).toBe(true);
    expect(attempts[12]).toBe("RATE_LIMITED");
    // Otro cliente no se ve afectado.
    await createOrder(db(), orderInput(slot.id, product.id), { clientId: "198.51.100.4" });
  });

  it("limita pedidos activos por número de WhatsApp en un día", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 100 });
    const phone = "3115550000";
    for (let i = 0; i < 6; i++) await createOrder(db(), orderInput(slot.id, product.id, 1, { phone }));
    await expectDomainError(createOrder(db(), orderInput(slot.id, product.id, 1, { phone })), "RATE_LIMITED");
  });
});
