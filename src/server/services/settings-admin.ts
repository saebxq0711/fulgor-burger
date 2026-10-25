import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { DbExecutor } from "../db/client";
import { settings } from "../db/schema";
import { DomainError } from "../errors";
import { normalizePhone } from "@/lib/phone";

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, { error: `Máximo ${maxLength} caracteres.` })
    .transform((value) => value || null);

export const settingsInputSchema = z.object({
  businessName: z.string().trim().min(2, { error: "Escribe el nombre." }).max(60, { error: "Máximo 60 caracteres." }),
  tagline: z.string().trim().max(120, { error: "Máximo 120 caracteres." }),
  whatsappNumber: z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (!value) return null;
      const result = normalizePhone(value);
      if (!result.ok) {
        ctx.addIssue({ code: "custom", message: "Número de WhatsApp inválido." });
        return z.NEVER;
      }
      return result.e164;
    }),
  contactEmail: z
    .string()
    .trim()
    .transform((value) => value || null)
    .pipe(z.email({ error: "Correo inválido." }).nullable()),
  instagramHandle: z
    .string()
    .trim()
    .transform((value) => value.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, ""))
    .pipe(z.string().regex(/^[A-Za-z0-9._]{0,30}$/, { error: "Usuario de Instagram inválido." }))
    .transform((value) => value || null),
  addressText: optionalText(200),
  serviceArea: optionalText(200),
  paymentNote: z.string().trim().min(5, { error: "Explica cómo se paga." }).max(240, { error: "Máximo 240 caracteres." }),
  privacyText: z.string().trim().min(40, { error: "El aviso de privacidad es muy corto." }).max(4000, { error: "Máximo 4000 caracteres." }),
  initialOrderStatus: z.enum(["pending", "confirmed"]),
  maxUnitsPerOrder: z.coerce.number().int().min(1, { error: "Mínimo 1." }).max(50, { error: "Máximo 50." }),
  requireAddress: z.boolean(),
  ordersPaused: z.boolean(),
  pausedMessage: optionalText(200),
});

export type SettingsInput = z.input<typeof settingsInputSchema>;

export async function updateSettings(db: DbExecutor, input: SettingsInput) {
  const parsed = settingsInputSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? "_form")] ??= issue.message;
    throw new DomainError("VALIDATION", "Revisa los campos marcados.", { fields });
  }
  const [row] = await db.update(settings).set({ ...parsed.data, updatedAt: new Date() }).where(eq(settings.id, 1)).returning();
  return row;
}

export async function setLogo(db: DbExecutor, logoId: string | null) {
  await db.update(settings).set({ logoId, updatedAt: new Date() }).where(eq(settings.id, 1));
}
