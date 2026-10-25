import "server-only";
import { eq } from "drizzle-orm";
import sharp, { type Metadata } from "sharp";
import type { DbExecutor } from "../db/client";
import { media } from "../db/schema";
import { DomainError } from "../errors";

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

/**
 * Guarda una imagen subida por el administrador. El formato se valida leyendo el archivo
 * (no la extensión), se corrige la orientación, se eliminan los metadatos (EXIF/GPS) y se
 * convierte a WebP de máximo `maxSide` píxeles.
 */
export async function saveImage(db: DbExecutor, file: File, maxSide = 1600): Promise<string> {
  if (!file || file.size === 0) throw new DomainError("VALIDATION", "Elige una imagen.");
  if (file.size > MAX_UPLOAD_BYTES) throw new DomainError("VALIDATION", "La imagen pesa más de 6 MB.");

  const input = Buffer.from(await file.arrayBuffer());
  let metadata: Metadata;
  try {
    metadata = await sharp(input).metadata();
  } catch {
    throw new DomainError("VALIDATION", "El archivo no es una imagen válida.");
  }
  if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw new DomainError("VALIDATION", "Usa una imagen JPG, PNG o WebP.");
  }
  if (!metadata.width || !metadata.height || metadata.width * metadata.height > 60_000_000) {
    throw new DomainError("VALIDATION", "La imagen es demasiado grande.");
  }

  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  const [row] = await db
    .insert(media)
    .values({ mimeType: "image/webp", bytes: data, byteSize: data.length, width: info.width, height: info.height })
    .returning({ id: media.id });
  return row.id;
}

export async function getMedia(db: DbExecutor, id: string) {
  const [row] = await db.select().from(media).where(eq(media.id, id));
  return row ?? null;
}
