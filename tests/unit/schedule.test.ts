import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { deliveryRules, deliverySlots, orders } from "@/server/db/schema";
import { getPublicSlots, getReservedUnits } from "@/server/services/availability";
import { createOrder } from "@/server/services/orders";
import { ensureUpcomingSlots, upcomingOccurrences } from "@/server/services/schedule";
import { businessDateString, formatTime, zonedInstant } from "@/lib/time";
import { db, makeProduct, orderInput, resetDatabase } from "./helpers";

const SUNDAYS = {
  weekday: 0,
  startTime: "12:00",
  endTime: "18:00",
  openDaysBefore: 6,
  openTime: "00:00",
  closeDaysBefore: 1,
  closeTime: "20:00",
  weeksAhead: 1,
};

/** Instante en hora de Bogotá, para escribir pruebas legibles. */
const bogota = (date: string, time: string) => zonedInstant(date, time);

describe("cálculo de fechas en America/Bogota", () => {
  it("un lunes publica el domingo de esa semana con apertura lunes y cierre sábado 20:00", () => {
    const [next] = upcomingOccurrences(SUNDAYS, bogota("2026-10-26", "10:00"));
    expect(next.deliveryDate).toBe("2026-11-01");
    expect(next.startsAt.toISOString()).toBe("2026-11-01T17:00:00.000Z"); // 12:00 en Bogotá (UTC-5)
    expect(next.opensAt.toISOString()).toBe("2026-10-26T05:00:00.000Z");
    expect(next.closesAt.toISOString()).toBe("2026-11-01T01:00:00.000Z"); // sábado 31, 20:00 Bogotá
  });

  it("después del cierre del sábado la siguiente fecha es el otro domingo", () => {
    const [next] = upcomingOccurrences(SUNDAYS, bogota("2026-10-31", "20:01"));
    expect(next.deliveryDate).toBe("2026-11-08");
  });

  it("el mismo domingo de entrega ya no se ofrece ese día", () => {
    const [next] = upcomingOccurrences(SUNDAYS, bogota("2026-11-01", "09:00"));
    expect(next.deliveryDate).toBe("2026-11-08");
  });

  it("la medianoche UTC no confunde el día local", () => {
    // 2026-11-01 02:00 UTC todavía es sábado 31 en Bogotá (21:00): ya cerró el domingo 1.
    expect(businessDateString(new Date("2026-11-01T02:00:00Z"))).toBe("2026-10-31");
    const [next] = upcomingOccurrences(SUNDAYS, new Date("2026-11-01T02:00:00Z"));
    expect(next.deliveryDate).toBe("2026-11-08");
  });

  it("publica varias semanas por adelantado si se configura", () => {
    const list = upcomingOccurrences({ ...SUNDAYS, weeksAhead: 3 }, bogota("2026-10-26", "10:00"));
    expect(list.map((o) => o.deliveryDate)).toEqual(["2026-11-01", "2026-11-08", "2026-11-15"]);
  });

  it("formatea horas en hora de Colombia", () => {
    expect(formatTime(bogota("2026-11-01", "12:00")).replace(/\s/g, " ")).toMatch(/^12:00\sp\.\s?m\.$/);
  });
});

describe("cambio semanal sin perder historial", () => {
  beforeEach(resetDatabase);

  it("al pasar la semana se publica una fecha nueva con cupo completo y se conserva la anterior", async () => {
    const product = await makeProduct();
    await db().insert(deliveryRules).values({ name: "Domingos", capacity: 20, ...SUNDAYS });

    // Semana 1: lunes 26 de octubre.
    const week1 = bogota("2026-10-26", "09:00");
    expect(await ensureUpcomingSlots(db(), week1)).toBe(1);
    const [slot1] = await db().select().from(deliverySlots);
    expect(slot1.deliveryDate).toBe("2026-11-01");

    for (let i = 0; i < 4; i++) {
      await createOrder(db(), orderInput(slot1.id, product.id, 2), { now: bogota("2026-10-28", "12:00") });
    }
    expect(await getReservedUnits(db(), slot1.id)).toBe(8);

    // Después del cierre del sábado: el domingo 1 deja de aceptar pedidos.
    const afterClose = bogota("2026-10-31", "20:30");
    await expect(createOrder(db(), orderInput(slot1.id, product.id, 1), { now: afterClose })).rejects.toMatchObject({
      code: "SLOT_CLOSED",
    });

    // El lunes siguiente se publica el domingo 8 con sus 20 cupos.
    const week2 = bogota("2026-11-02", "08:00");
    await ensureUpcomingSlots(db(), week2);
    const slots = await db().select().from(deliverySlots).orderBy(asc(deliverySlots.startsAt));
    expect(slots.map((s) => s.deliveryDate)).toEqual(["2026-11-01", "2026-11-08"]);
    const slot2 = slots[1];
    expect(await getReservedUnits(db(), slot2.id)).toBe(0);

    const publicSlots = await getPublicSlots(db(), week2);
    expect(publicSlots).toHaveLength(1);
    expect(publicSlots[0]).toMatchObject({ deliveryDate: "2026-11-08", remaining: 20, state: "open" });

    // Pedido de la semana 2 no toca el historial de la semana 1.
    await createOrder(db(), orderInput(slot2.id, product.id, 3), { now: week2 });
    expect(await getReservedUnits(db(), slot1.id)).toBe(8);
    expect(await getReservedUnits(db(), slot2.id)).toBe(3);
    expect(await db().select().from(orders).where(eq(orders.slotId, slot1.id))).toHaveLength(4);
  });

  it("la fecha nueva aparece como próxima (aún no abre) si se publica antes de su apertura", async () => {
    await db().insert(deliveryRules).values({ name: "Domingos", capacity: 20, ...SUNDAYS });
    const saturdayNight = bogota("2026-10-31", "21:00");
    await ensureUpcomingSlots(db(), saturdayNight);
    const [slot] = await getPublicSlots(db(), saturdayNight);
    expect(slot).toMatchObject({ deliveryDate: "2026-11-08", state: "upcoming" });
  });

  it("generar varias veces o en paralelo no duplica fechas", async () => {
    await db().insert(deliveryRules).values({ name: "Domingos", capacity: 20, ...SUNDAYS, weeksAhead: 2 });
    const now = bogota("2026-10-26", "09:00");
    await Promise.all(Array.from({ length: 6 }, () => ensureUpcomingSlots(db(), now)));
    await ensureUpcomingSlots(db(), now);
    expect(await db().select().from(deliverySlots)).toHaveLength(2);
  });

  it("una regla inactiva no publica fechas", async () => {
    await db().insert(deliveryRules).values({ name: "Domingos", capacity: 20, ...SUNDAYS, active: false });
    expect(await ensureUpcomingSlots(db(), bogota("2026-10-26", "09:00"))).toBe(0);
  });

  it("sin fechas publicadas la lista pública está vacía", async () => {
    expect(await getPublicSlots(db())).toEqual([]);
  });
});
