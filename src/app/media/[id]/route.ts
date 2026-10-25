import { getDb } from "@/server/db/client";
import { getMedia } from "@/server/services/media";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sirve imágenes subidas desde el panel. Cada id es inmutable: se cachea para siempre. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("No encontrado", { status: 404 });
  const file = await getMedia(getDb(), id);
  if (!file) return new Response("No encontrado", { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.byteSize),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
