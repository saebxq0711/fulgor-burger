import { z } from "zod";
import { normalizePhone } from "./phone";

const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;

/** Nombre del cliente: 2 a 60 caracteres, solo letras, espacios y signos comunes de nombres. */
export const customerNameSchema = z
  .string({ error: "Escribe tu nombre." })
  .transform((value) => value.normalize("NFC").replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(2, { error: "Escribe tu nombre (mínimo 2 letras)." })
      .max(60, { error: "El nombre puede tener máximo 60 caracteres." })
      .regex(NAME_PATTERN, { error: "Usa solo letras y espacios en el nombre." }),
  );

/** Teléfono con WhatsApp; se guarda normalizado en E.164. */
export const whatsappSchema = z
  .string({ error: "Escribe tu número de WhatsApp." })
  .transform((value, ctx) => {
    const result = normalizePhone(value);
    if (!result.ok) {
      ctx.addIssue({
        code: "custom",
        message: "Revisa el número: debe ser un celular con WhatsApp, por ejemplo 300 123 4567.",
      });
      return z.NEVER;
    }
    return result.e164;
  });

export const orderItemSchema = z.object({
  productId: z.uuid({ error: "Producto inválido." }),
  quantity: z
    .number({ error: "Cantidad inválida." })
    .int({ error: "La cantidad debe ser un número entero." })
    .min(1, { error: "Pide al menos una unidad." })
    .max(50, { error: "Cantidad demasiado alta." }),
});

export const createOrderSchema = z.object({
  idempotencyKey: z.uuid({ error: "Solicitud inválida." }),
  slotId: z.uuid({ error: "Elige un día de entrega." }),
  items: z
    .array(orderItemSchema)
    .min(1, { error: "Elige al menos una hamburguesa." })
    .max(10, { error: "Demasiados productos en un solo pedido." })
    .refine((items) => new Set(items.map((item) => item.productId)).size === items.length, {
      error: "Producto repetido en el pedido.",
    }),
  name: customerNameSchema,
  phone: whatsappSchema,
  address: z
    .string()
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .pipe(z.string().max(200, { error: "La dirección puede tener máximo 200 caracteres." }))
    .optional(),
  /** Campo trampa: los humanos no lo ven; si llega con contenido, es un robot. */
  website: z.string().max(200).optional(),
});

export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type CreateOrderData = z.output<typeof createOrderSchema>;

/** Convierte errores de zod en un mapa campo → primer mensaje. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "_form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}
