import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { GET as availability } from "@/app/api/availability/route";
import { GET as cron } from "@/app/api/cron/slots/route";
import { GET as ordersGet, POST as ordersPost } from "@/app/api/orders/route";
import { db, makeProduct, makeSlot, resetDatabase } from "./helpers";
import { deliveryRules } from "@/server/db/schema";

const ORIGIN = "http://localhost:3000";

function postOrder(body: unknown, headers: Record<string, string> = {}) {
  return ordersPost(
    new Request(`${ORIGIN}/api/orders`, {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost:3000", origin: ORIGIN, "x-forwarded-for": "203.0.113.50", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(resetDatabase);

describe("API pública de pedidos", () => {
  it("crea el pedido (201), y el reintento idéntico responde el mismo pedido (200)", async () => {
    const product = await makeProduct({ priceCop: 25000 });
    const slot = await makeSlot();
    const body = { idempotencyKey: randomUUID(), slotId: slot.id, items: [{ productId: product.id, quantity: 2 }], name: "Camila Ruiz", phone: "3209876543" };

    const created = await postOrder(body);
    expect(created.status).toBe(201);
    const first = await created.json();
    expect(first.order).toMatchObject({ totalCop: 50000, totalUnits: 2 });

    const retry = await postOrder(body);
    expect(retry.status).toBe(200);
    expect((await retry.json()).order.code).toBe(first.order.code);
  });

  it("rechaza peticiones sin origen o desde otro sitio (403)", async () => {
    const product = await makeProduct();
    const slot = await makeSlot();
    const body = { idempotencyKey: randomUUID(), slotId: slot.id, items: [{ productId: product.id, quantity: 1 }], name: "Camila Ruiz", phone: "3209876543" };
    expect((await postOrder(body, { origin: "https://sitio-malicioso.example" })).status).toBe(403);
    const noOrigin = new Request(`${ORIGIN}/api/orders`, { method: "POST", headers: { "content-type": "application/json", host: "localhost:3000" }, body: JSON.stringify(body) });
    expect((await ordersPost(noOrigin)).status).toBe(403);
  });

  it("devuelve errores claros y sin detalles internos", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 1 });
    const base = { slotId: slot.id, items: [{ productId: product.id, quantity: 1 }], name: "Camila Ruiz" };

    const invalid = await postOrder({ ...base, idempotencyKey: randomUUID(), phone: "123" });
    expect(invalid.status).toBe(422);
    const invalidBody = await invalid.json();
    expect(invalidBody.fields.phone).toBeTruthy();

    await postOrder({ ...base, idempotencyKey: randomUUID(), phone: "3001112233" });
    const soldOut = await postOrder({ ...base, idempotencyKey: randomUUID(), phone: "3001112244" });
    expect(soldOut.status).toBe(409);
    const soldOutBody = await soldOut.json();
    expect(soldOutBody).toMatchObject({ code: "SOLD_OUT", remaining: 0 });
    expect(JSON.stringify(soldOutBody)).not.toMatch(/stack|postgres|select|insert/i);

    const malformed = await ordersPost(
      new Request(`${ORIGIN}/api/orders`, { method: "POST", headers: { "content-type": "application/json", host: "localhost:3000", origin: ORIGIN }, body: "{no-json" }),
    );
    expect(malformed.status).toBe(422);
  });

  it("no existe forma pública de leer pedidos", async () => {
    expect((await ordersGet()).status).toBe(404);
  });
});

describe("disponibilidad pública", () => {
  it("muestra cupos y productos sin exponer datos de clientes", async () => {
    const product = await makeProduct();
    const slot = await makeSlot({ capacity: 20 });
    await postOrder({ idempotencyKey: randomUUID(), slotId: slot.id, items: [{ productId: product.id, quantity: 3 }], name: "Valentina Secreta", phone: "3157654321" });

    const response = await availability();
    expect(response.headers.get("cache-control")).toContain("no-store");
    const body = await response.json();
    const text = JSON.stringify(body);
    expect(body.slots[0]).toMatchObject({ id: slot.id, capacity: 20, remaining: 17, state: "open" });
    expect(text).not.toContain("Valentina");
    expect(text).not.toContain("3157654321");
    expect(text).not.toMatch(/FB-[A-Z0-9]{7}/);
    expect(text).not.toMatch(/customer|phone":"\+/i);
  });

  it("publica sola la fecha semanal al consultarse (no depende del panel)", async () => {
    await makeProduct();
    await db().insert(deliveryRules).values({
      name: "Domingos",
      weekday: 0,
      startTime: "12:00",
      endTime: "18:00",
      capacity: 20,
      openDaysBefore: 6,
      openTime: "00:00",
      closeDaysBefore: 1,
      closeTime: "20:00",
      weeksAhead: 1,
    });
    const body = await (await availability()).json();
    expect(body.slots).toHaveLength(1);
    expect(body.slots[0].capacity).toBe(20);
  });
});

describe("tarea programada", () => {
  it("exige el secreto del cron", async () => {
    expect((await cron(new Request(`${ORIGIN}/api/cron/slots`))).status).toBe(401);
    expect((await cron(new Request(`${ORIGIN}/api/cron/slots`, { headers: { authorization: "Bearer otro" } }))).status).toBe(401);
    const ok = await cron(new Request(`${ORIGIN}/api/cron/slots`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }));
    expect(ok.status).toBe(200);
  });
});
