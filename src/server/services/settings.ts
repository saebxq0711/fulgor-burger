import "server-only";
import { eq } from "drizzle-orm";
import type { DbExecutor } from "../db/client";
import { settings, type Settings } from "../db/schema";

export async function getSettings(db: DbExecutor): Promise<Settings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (row) return row;
  // La migración inserta la fila; esto solo cubre una base creada a mano.
  const [created] = await db
    .insert(settings)
    .values({
      id: 1,
      paymentNote: "Coordinamos el pago contigo por WhatsApp antes de la entrega.",
      privacyText:
        "Usamos tu nombre y tu número de WhatsApp solo para preparar tu pedido y escribirte sobre él. No los compartimos con nadie ni los usamos para publicidad.",
    })
    .onConflictDoNothing()
    .returning();
  return created ?? (await db.select().from(settings).where(eq(settings.id, 1)))[0];
}

/** Subconjunto seguro para la página pública. */
export type PublicSettings = Pick<
  Settings,
  | "businessName"
  | "tagline"
  | "whatsappNumber"
  | "contactEmail"
  | "instagramHandle"
  | "addressText"
  | "serviceArea"
  | "paymentNote"
  | "privacyText"
  | "maxUnitsPerOrder"
  | "requireAddress"
  | "ordersPaused"
  | "pausedMessage"
  | "initialOrderStatus"
> & { logoUrl: string | null };

export function toPublicSettings(row: Settings): PublicSettings {
  return {
    businessName: row.businessName,
    tagline: row.tagline,
    whatsappNumber: row.whatsappNumber,
    contactEmail: row.contactEmail,
    instagramHandle: row.instagramHandle,
    addressText: row.addressText,
    serviceArea: row.serviceArea,
    paymentNote: row.paymentNote,
    privacyText: row.privacyText,
    maxUnitsPerOrder: row.maxUnitsPerOrder,
    requireAddress: row.requireAddress,
    ordersPaused: row.ordersPaused,
    pausedMessage: row.pausedMessage,
    initialOrderStatus: row.initialOrderStatus,
    logoUrl: row.logoId ? `/media/${row.logoId}` : null,
  };
}
