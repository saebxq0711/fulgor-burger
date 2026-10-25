import { getDb } from "@/server/db/client";
import { DomainError } from "@/server/errors";
import { clientIp, errorResponse, isSameOrigin, json, readJson } from "@/server/http";
import { createOrder } from "@/server/services/orders";

export const dynamic = "force-dynamic";

/** Crea un pedido. Precio, cupo y fechas se validan en el servidor; nada se confía al navegador. */
export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) {
      throw new DomainError("FORBIDDEN", "Solicitud no permitida.");
    }
    const body = await readJson(request);
    const { receipt, replayed } = await createOrder(getDb(), body, { clientId: clientIp(request) });
    return json({ ok: true, replayed, order: receipt }, replayed ? 200 : 201);
  } catch (error) {
    return errorResponse(error);
  }
}

/** No existe consulta pública de pedidos: evita la enumeración y protege los datos de clientes. */
export function GET() {
  return json({ ok: false, code: "NOT_FOUND", message: "No encontrado." }, 404);
}
