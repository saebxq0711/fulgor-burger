import "server-only";
import { asc, eq, max, ne, and } from "drizzle-orm";
import { z } from "zod";
import type { Database, DbExecutor } from "../db/client";
import { products } from "../db/schema";
import { DomainError } from "../errors";

export const productInputSchema = z.object({
  name: z.string().trim().min(2, { error: "Escribe el nombre." }).max(80, { error: "Máximo 80 caracteres." }),
  description: z.string().trim().max(600, { error: "Máximo 600 caracteres." }),
  priceCop: z.coerce
    .number({ error: "Escribe el precio." })
    .int({ error: "El precio va en pesos enteros, sin decimales." })
    .min(100, { error: "El precio parece demasiado bajo." })
    .max(5_000_000, { error: "El precio parece demasiado alto." }),
  imageAlt: z.string().trim().max(160, { error: "Máximo 160 caracteres." }),
  maxPerOrder: z
    .union([z.literal(""), z.coerce.number().int().min(1, { error: "Mínimo 1." }).max(50, { error: "Máximo 50." })])
    .transform((value) => (value === "" ? null : value)),
  active: z.boolean(),
});

export type ProductInput = z.input<typeof productInputSchema>;

function parse(input: ProductInput) {
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? "_form")] ??= issue.message;
    throw new DomainError("VALIDATION", "Revisa los campos marcados.", { fields });
  }
  return parsed.data;
}

export function slugify(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "producto"
  );
}

async function uniqueSlug(db: DbExecutor, name: string, exceptId?: string) {
  const base = slugify(name);
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? base : `${base}-${n + 1}`;
    const clash = await db
      .select({ id: products.id })
      .from(products)
      .where(exceptId ? and(eq(products.slug, candidate), ne(products.id, exceptId)) : eq(products.slug, candidate));
    if (!clash.length) return candidate;
  }
  throw new DomainError("CONFLICT", "No se pudo generar un identificador para el producto.");
}

/** Slug del producto que crea el seed; mientras nadie lo edite, el panel pide revisarlo. */
export const SAMPLE_PRODUCT_SLUG = "fulgor-clasica";

/** Producto de ejemplo que nadie ha revisado aún (nombre, descripción y precio inventados). */
export async function unreviewedSampleProduct(db: DbExecutor) {
  const [product] = await db.select().from(products).where(eq(products.slug, SAMPLE_PRODUCT_SLUG));
  return product && product.updatedAt.getTime() === product.createdAt.getTime() ? product : null;
}

export async function listProducts(db: DbExecutor) {
  return db.select().from(products).orderBy(asc(products.sortOrder), asc(products.createdAt));
}

export async function getProduct(db: DbExecutor, id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  return product ?? null;
}

export async function createProduct(db: DbExecutor, input: ProductInput, imageId: string | null = null) {
  const data = parse(input);
  const [{ value: lastOrder }] = await db.select({ value: max(products.sortOrder) }).from(products);
  const [product] = await db
    .insert(products)
    .values({ ...data, imageId, slug: await uniqueSlug(db, data.name), sortOrder: (lastOrder ?? -1) + 1 })
    .returning();
  return product;
}

export async function updateProduct(db: DbExecutor, id: string, input: ProductInput, imageId?: string | null) {
  const data = parse(input);
  const [product] = await db
    .update(products)
    .set({
      ...data,
      ...(imageId !== undefined ? { imageId } : {}),
      slug: await uniqueSlug(db, data.name, id),
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();
  if (!product) throw new DomainError("NOT_FOUND", "El producto no existe.");
  return product;
}

export async function setProductActive(db: DbExecutor, id: string, active: boolean) {
  const [product] = await db.update(products).set({ active, updatedAt: new Date() }).where(eq(products.id, id)).returning();
  if (!product) throw new DomainError("NOT_FOUND", "El producto no existe.");
  return product;
}

/** Mueve un producto una posición arriba o abajo en el orden público. */
export async function moveProduct(db: Database, id: string, direction: "up" | "down") {
  await db.transaction(async (tx) => {
    const list = await tx.select({ id: products.id }).from(products).orderBy(asc(products.sortOrder), asc(products.createdAt)).for("update");
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) throw new DomainError("NOT_FOUND", "El producto no existe.");
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    for (let position = 0; position < list.length; position++) {
      await tx.update(products).set({ sortOrder: position }).where(eq(products.id, list[position].id));
    }
  });
}
