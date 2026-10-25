import "server-only";
import type { DbExecutor } from "../db/client";
import { getPublicProducts, getPublicSlots, type PublicProduct, type PublicSlot } from "./availability";
import { ensureUpcomingSlotsThrottled } from "./schedule";
import { getSettings, toPublicSettings, type PublicSettings } from "./settings";

export type PublicMenu = {
  serverTime: string;
  slots: PublicSlot[];
  products: PublicProduct[];
  settings: PublicSettings;
};

/**
 * Todo lo que la página pública necesita, sin datos personales. Antes de leer, publica las
 * fechas semanales que tocan: así el cambio de semana no depende de que alguien abra el panel.
 */
export async function getPublicMenu(db: DbExecutor, now = new Date()): Promise<PublicMenu> {
  try {
    await ensureUpcomingSlotsThrottled(db, now);
  } catch (error) {
    console.error("[schedule] no se pudieron publicar las fechas", error);
  }
  const [slots, products, settingsRow] = await Promise.all([getPublicSlots(db, now), getPublicProducts(db), getSettings(db)]);
  return { serverTime: now.toISOString(), slots, products, settings: toPublicSettings(settingsRow) };
}
