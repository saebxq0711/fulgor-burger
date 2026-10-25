// Seed de desarrollo NO destructivo: solo crea lo que falta, nunca borra ni sobrescribe.
// Uso: pnpm db:seed
import "dotenv/config";
import { and, asc, eq, gt } from "drizzle-orm";
import { closeDb, getDb } from "../src/server/db/client";
import { adminUsers, deliveryRules, deliverySlots, products } from "../src/server/db/schema";
import { ensureUpcomingSlots } from "../src/server/services/schedule";
import { createAdminUser } from "./lib/admin";

async function main() {
  const db = getDb();
  const now = new Date();

  const existingProducts = await db.select({ id: products.id }).from(products).limit(1);
  if (!existingProducts.length) {
    await db.insert(products).values({
      slug: "fulgor-clasica",
      name: "Fulgor Clásica",
      // Contenido de ejemplo: el administrador debe reemplazar nombre, descripción y precio reales.
      // La descripción no afirma ingredientes; el panel avisa hasta que se edite (ver SAMPLE_PRODUCT_SLUG).
      description: "La hamburguesa de la tanda, hecha para el día de entrega que elijas.",
      priceCop: 28000,
      imageAlt: "Hamburguesa Fulgor Clásica",
      active: true,
      sortOrder: 0,
    });
    console.log("· Producto de ejemplo creado (revisa nombre, descripción y precio en el panel).");
  }

  let [rule] = await db.select().from(deliveryRules).orderBy(asc(deliveryRules.createdAt)).limit(1);
  let ruleCreated = false;
  if (!rule) {
    [rule] = await db
      .insert(deliveryRules)
      .values({
        name: "Domingos",
        weekday: 0,
        startTime: "12:00",
        endTime: "18:00",
        capacity: 20,
        openDaysBefore: 6, // abre el lunes anterior…
        openTime: "00:00",
        closeDaysBefore: 1, // …y cierra el sábado anterior
        closeTime: "20:00",
        weeksAhead: 1,
        active: true,
      })
      .returning();
    ruleCreated = true;
    console.log("· Regla semanal creada: domingos 12:00–18:00, 20 cupos, cierre sábado 20:00.");
  }

  const created = await ensureUpcomingSlots(db, now);
  if (created) console.log(`· ${created} fecha(s) publicada(s).`);

  if (ruleCreated) {
    // En la primera instalación la próxima fecha abre de inmediato, aunque su apertura
    // programada (lunes) todavía no haya llegado.
    const [next] = await db
      .select()
      .from(deliverySlots)
      .where(and(eq(deliverySlots.ruleId, rule.id), gt(deliverySlots.closesAt, now)))
      .orderBy(asc(deliverySlots.startsAt))
      .limit(1);
    if (next && next.opensAt && next.opensAt > now) {
      await db.update(deliverySlots).set({ opensAt: now }).where(eq(deliverySlots.id, next.id));
      console.log(`· La fecha ${next.deliveryDate} abre desde ya.`);
    }
  }

  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email.toLowerCase()));
    if (!existing) {
      await createAdminUser(db, { email, password, name: process.env.ADMIN_NAME?.trim() || "Administrador" });
      console.log(`· Administrador ${email} creado. Quita ADMIN_PASSWORD del entorno.`);
    }
  }

  console.log("Seed terminado.");
}

main()
  .catch((error) => {
    console.error("El seed falló:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(closeDb);
