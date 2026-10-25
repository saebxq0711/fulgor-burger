import { getDb } from "@/server/db/client";
import { errorResponse, json } from "@/server/http";
import { getPublicMenu } from "@/server/services/public-menu";

export const dynamic = "force-dynamic";

/** Cupos y productos públicos. Se consulta cada pocos segundos desde la página. */
export async function GET() {
  try {
    const menu = await getPublicMenu(getDb());
    return json({ ok: true, ...menu });
  } catch (error) {
    return errorResponse(error);
  }
}
