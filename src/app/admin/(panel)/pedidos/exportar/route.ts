import { getCurrentAdmin } from "@/server/auth/current";
import { can } from "@/server/auth/sessions";
import { toCsv } from "@/server/csv";
import { getDb } from "@/server/db/client";
import { slotText } from "@/server/services/availability";
import { ORDER_STATUS_LABELS, ordersForExport } from "@/server/services/orders";
import { businessDateString, formatDateTime } from "@/lib/time";
import { parseOrderFilters } from "../filters";

export const dynamic = "force-dynamic";

/** Exporta pedidos a CSV. Solo administradores con sesión válida. */
export async function GET(request: Request) {
  const user = await getCurrentAdmin();
  if (!user || !can(user, "orders:read")) {
    return new Response("No autorizado", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const filters = parseOrderFilters(new URL(request.url).searchParams);
  const rows = await ordersForExport(getDb(), filters);
  const csv = toCsv([
    ["Código", "Fecha de entrega", "Franja", "Estado", "Nombre", "WhatsApp", "Dirección", "Productos", "Unidades", "Total COP", "Notas", "Creado"],
    ...rows.map(({ order, slot, items }) => {
      const text = slotText(slot);
      return [
        order.code,
        slot.deliveryDate,
        text.window,
        ORDER_STATUS_LABELS[order.status],
        order.customerName,
        order.customerPhone,
        order.deliveryAddress ?? "",
        items.map((item) => `${item.quantity} x ${item.productName}`).join(", "),
        order.totalUnits,
        order.totalCop,
        order.adminNotes ?? "",
        formatDateTime(order.createdAt),
      ];
    }),
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pedidos-fulgor-${businessDateString(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
