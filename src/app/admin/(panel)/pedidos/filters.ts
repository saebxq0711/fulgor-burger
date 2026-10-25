import type { OrderStatus } from "@/server/db/schema";
import type { OrderFilters } from "@/server/services/orders";

const STATUS_VALUES: OrderStatus[] = ["pending", "confirmed", "fulfilled", "cancelled"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

/** Filtros de la lista de pedidos a partir de la URL (?q=&estado=&fecha=). */
export function parseOrderFilters(params: Params): OrderFilters {
  const pick = (key: string) => {
    const value = params instanceof URLSearchParams ? params.get(key) : params[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };
  const status = pick("estado");
  const slot = pick("fecha");
  return {
    q: pick("q")?.slice(0, 80),
    status: status && STATUS_VALUES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined,
    slotId: slot && UUID.test(slot) ? slot : undefined,
  };
}

export function filtersQuery(filters: OrderFilters, extra: Record<string, string> = {}) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("estado", filters.status);
  if (filters.slotId) params.set("fecha", filters.slotId);
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
  const text = params.toString();
  return text ? `?${text}` : "";
}
