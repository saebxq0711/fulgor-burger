import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { adminSessions, adminUsers, deliverySlots } from "@/server/db/schema";
import { hashPassword, passwordProblem, verifyPassword } from "@/server/auth/password";
import { authenticate, can, createSession, userForSessionToken } from "@/server/auth/sessions";
import { getPublicProducts, getReservedUnits } from "@/server/services/availability";
import { createOrder } from "@/server/services/orders";
import { createProduct, moveProduct, listProducts, setProductActive, updateProduct } from "@/server/services/products";
import { createSpecialSlot, setSlotCapacity, setSlotStatus, updateSlot } from "@/server/services/slots";
import { db, makeProduct, makeSlot, orderInput, resetDatabase } from "./helpers";

beforeEach(resetDatabase);

describe("autenticación del panel", () => {
  it("guarda contraseñas con scrypt y las verifica", async () => {
    const hash = await hashPassword("una-clave-muy-larga-2026");
    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(hash).not.toContain("una-clave");
    expect(await verifyPassword("una-clave-muy-larga-2026", hash)).toBe(true);
    expect(await verifyPassword("otra-clave-muy-larga-2026", hash)).toBe(false);
  });

  it("exige contraseñas razonables", () => {
    expect(passwordProblem("corta")).toBeTruthy();
    expect(passwordProblem("aaaaaaaaaaaaaaaa")).toBeTruthy();
    expect(passwordProblem("hamburguesa-domingo-20")).toBeNull();
  });

  it("solo autentica con la contraseña correcta y usuarios activos", async () => {
    await db().insert(adminUsers).values({ email: "dueno@fulgor.co", name: "Dueño", passwordHash: await hashPassword("clave-segura-del-panel") });
    expect(await authenticate(db(), "dueno@fulgor.co", "equivocada-123456")).toBeNull();
    expect(await authenticate(db(), "nadie@fulgor.co", "clave-segura-del-panel")).toBeNull();
    expect(await authenticate(db(), "DUENO@fulgor.co", "clave-segura-del-panel")).toMatchObject({ email: "dueno@fulgor.co", role: "admin" });

    await db().update(adminUsers).set({ active: false });
    expect(await authenticate(db(), "dueno@fulgor.co", "clave-segura-del-panel")).toBeNull();
  });

  it("la sesión se guarda hasheada, caduca y no acepta tokens inventados", async () => {
    const [user] = await db()
      .insert(adminUsers)
      .values({ email: "dueno@fulgor.co", name: "Dueño", passwordHash: await hashPassword("clave-segura-del-panel") })
      .returning();
    const { token } = await createSession(db(), user.id);
    const [stored] = await db().select().from(adminSessions);
    expect(stored.tokenHash).not.toBe(token);

    expect(await userForSessionToken(db(), token)).toMatchObject({ id: user.id });
    expect(await userForSessionToken(db(), undefined)).toBeNull();
    expect(await userForSessionToken(db(), "token-inventado-por-un-atacante-123")).toBeNull();

    await db().update(adminSessions).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await userForSessionToken(db(), token)).toBeNull();
  });

  it("los permisos dependen del rol (staff no gestiona catálogo ni configuración)", () => {
    expect(can({ role: "admin" }, "catalog:write")).toBe(true);
    expect(can({ role: "admin" }, "settings:write")).toBe(true);
    expect(can({ role: "staff" }, "orders:write")).toBe(true);
    expect(can({ role: "staff" }, "catalog:write")).toBe(false);
    expect(can({ role: "staff" }, "settings:write")).toBe(false);
  });
});

describe("gestión de productos", () => {
  it("crea, edita, ordena y desactiva productos", async () => {
    const first = await createProduct(db(), { name: "Fulgor Clásica", description: "", priceCop: "28000", imageAlt: "", maxPerOrder: "", active: true });
    const second = await createProduct(db(), { name: "Fulgor Doble", description: "Doble carne", priceCop: 36000, imageAlt: "", maxPerOrder: "3", active: true });
    expect(second.slug).toBe("fulgor-doble");
    expect(second.maxPerOrder).toBe(3);

    await moveProduct(db(), second.id, "up");
    expect((await listProducts(db())).map((p) => p.id)).toEqual([second.id, first.id]);

    await updateProduct(db(), first.id, { name: "Fulgor Clásica", description: "Nueva", priceCop: 30000, imageAlt: "", maxPerOrder: "", active: true });
    await setProductActive(db(), second.id, false);
    const publicProducts = await getPublicProducts(db());
    expect(publicProducts.map((p) => [p.name, p.priceCop])).toEqual([["Fulgor Clásica", 30000]]);
  });

  it("valida el precio en pesos enteros", async () => {
    await expect(
      createProduct(db(), { name: "Mala", description: "", priceCop: "28000.5", imageAlt: "", maxPerOrder: "", active: true }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("cambiar el precio no altera pedidos ya hechos", async () => {
    const product = await makeProduct({ priceCop: 28000 });
    const slot = await makeSlot();
    const { receipt } = await createOrder(db(), orderInput(slot.id, product.id, 2));
    await updateProduct(db(), product.id, { name: product.name, description: "", priceCop: 50000, imageAlt: "", maxPerOrder: "", active: true });
    const totals = await db().execute(sql`SELECT total_cop FROM orders WHERE code = ${receipt.code}`);
    expect(totals.rows[0].total_cop).toBe(56000);
  });
});

describe("gestión de fechas y capacidad", () => {
  it("crea una fecha especial y ajusta su capacidad", async () => {
    const product = await makeProduct();
    const slot = await createSpecialSlot(db(), {
      deliveryDate: "2030-12-24",
      label: "Nochebuena",
      startTime: "17:00",
      endTime: "21:00",
      closeDate: "2030-12-23",
      closeTime: "20:00",
      capacity: "30",
    });
    expect(slot).toMatchObject({ capacity: 30, label: "Nochebuena", status: "open" });

    await createOrder(db(), orderInput(slot.id, product.id, 5));
    await setSlotCapacity(db(), slot.id, 40);
    await expect(setSlotCapacity(db(), slot.id, 4)).rejects.toMatchObject({ code: "CAPACITY_BELOW_RESERVED" });
    const [stored] = await db().select().from(deliverySlots).where(eq(deliverySlots.id, slot.id));
    expect(stored.capacity).toBe(40);
    expect(await getReservedUnits(db(), slot.id)).toBe(5);
  });

  it("valida horarios incoherentes", async () => {
    await expect(
      createSpecialSlot(db(), { deliveryDate: "2030-12-24", label: "", startTime: "18:00", endTime: "17:00", closeDate: "2030-12-23", closeTime: "20:00", capacity: 10 }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      createSpecialSlot(db(), { deliveryDate: "2030-12-24", label: "", startTime: "12:00", endTime: "17:00", closeDate: "2030-12-25", closeTime: "20:00", capacity: 10 }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("pausar y reabrir una fecha controla si acepta pedidos", async () => {
    const product = await makeProduct();
    const slot = await makeSlot();
    await setSlotStatus(db(), slot.id, "paused");
    await expect(createOrder(db(), orderInput(slot.id, product.id))).rejects.toMatchObject({ code: "SLOT_CLOSED" });
    await setSlotStatus(db(), slot.id, "open");
    await createOrder(db(), orderInput(slot.id, product.id));
  });

  it("no reabre una fecha cuyo cierre ya pasó sin mover el cierre", async () => {
    const slot = await makeSlot({ status: "closed", closesAt: new Date(Date.now() - 1000) });
    await expect(setSlotStatus(db(), slot.id, "open")).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("editar la fecha no permite dejar la capacidad bajo lo reservado", async () => {
    const product = await makeProduct();
    const slot = await createSpecialSlot(db(), { deliveryDate: "2030-06-02", label: "", startTime: "12:00", endTime: "18:00", closeDate: "2030-06-01", closeTime: "20:00", capacity: 10 });
    await createOrder(db(), orderInput(slot.id, product.id, 6));
    await expect(
      updateSlot(db(), slot.id, { deliveryDate: "2030-06-02", label: "", startTime: "12:00", endTime: "18:00", closeDate: "2030-06-01", closeTime: "20:00", capacity: 5 }),
    ).rejects.toMatchObject({ code: "CAPACITY_BELOW_RESERVED" });
  });
});
