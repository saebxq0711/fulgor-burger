import { desc } from "drizzle-orm";
import { Download, Search } from "lucide-react";
import Link from "next/link";
import { OrderStatusPill, PageTitle, Panel, linkButtonSecondary } from "@/components/admin/ui";
import { formatCop } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { formatDateTime } from "@/lib/time";
import { requireAdmin } from "@/server/auth/current";
import { getDb } from "@/server/db/client";
import { deliverySlots, type OrderStatus } from "@/server/db/schema";
import { slotText } from "@/server/services/availability";
import { listOrders, ORDER_STATUS_LABELS } from "@/server/services/orders";
import { filtersQuery as query, parseOrderFilters } from "./filters";

export const metadata = { title: "Pedidos" };

const STATUS_VALUES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin("orders:read");
  const params = await searchParams;
  const filters = parseOrderFilters(params);
  const page = Math.max(1, Number(typeof params.pagina === "string" ? params.pagina : 1) || 1);
  const db = getDb();
  const [{ rows, total, pageSize }, slots] = await Promise.all([
    listOrders(db, filters, page),
    db.select().from(deliverySlots).orderBy(desc(deliverySlots.startsAt)).limit(40),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const filtered = Boolean(filters.q || filters.status || filters.slotId);

  return (
    <>
      <PageTitle
        title="Pedidos"
        description={`${total} ${total === 1 ? "pedido" : "pedidos"}${filtered ? " con estos filtros" : " en total"}.`}
        actions={
          <a href={`/admin/pedidos/exportar${query(filters)}`} className={linkButtonSecondary}>
            <Download aria-hidden className="size-4" />
            Exportar CSV
          </a>
        }
      />

      <form method="get" className="grid gap-3 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end" role="search" aria-label="Filtrar pedidos">
        <div className="grid gap-1.5">
          <label htmlFor="q" className="text-sm font-medium">
            Buscar
          </label>
          <div className="relative">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
            <input
              id="q"
              name="q"
              defaultValue={filters.q}
              placeholder="Nombre, teléfono o código"
              className="h-10 w-full rounded-lg border border-line-strong bg-panel pl-9 pr-3 text-[15px] focus:border-coffee focus:outline-none"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="fecha" className="text-sm font-medium">
            Fecha de entrega
          </label>
          <select id="fecha" name="fecha" defaultValue={filters.slotId ?? ""} className="h-10 rounded-lg border border-line-strong bg-panel px-3 text-[15px]">
            <option value="">Todas</option>
            {slots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slotText(slot).shortDay}
                {slot.label ? ` · ${slot.label}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="estado" className="text-sm font-medium">
            Estado
          </label>
          <select id="estado" name="estado" defaultValue={filters.status ?? ""} className="h-10 rounded-lg border border-line-strong bg-panel px-3 text-[15px]">
            <option value="">Todos</option>
            {STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="inline-flex h-10 items-center rounded-lg bg-coffee px-4 text-sm font-semibold text-[#fff8ee] hover:bg-[#4d2e21]">
            Filtrar
          </button>
          {filtered ? (
            <Link href="/admin/pedidos" className="inline-flex h-10 items-center rounded-lg px-3 text-sm text-ink-soft hover:bg-tint hover:text-ink">
              Limpiar
            </Link>
          ) : null}
        </div>
      </form>

      <Panel>
        {rows.length ? (
          <>
            <table className="hidden w-full text-left text-[15px] md:table">
              <thead>
                <tr className="border-b border-line text-[13px] text-ink-soft">
                  <th scope="col" className="px-5 py-3 font-medium">Pedido</th>
                  <th scope="col" className="px-3 py-3 font-medium">Cliente</th>
                  <th scope="col" className="px-3 py-3 font-medium">Entrega</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Unid.</th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">Total</th>
                  <th scope="col" className="px-5 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(({ order, slot }) => (
                  <tr key={order.id} className="group relative hover:bg-tint/50">
                    <td className="px-5 py-3">
                      <Link href={`/admin/pedidos/${order.id}`} className="font-semibold text-ink tabular after:absolute after:inset-0">
                        {order.code}
                      </Link>
                      <span className="block text-[13px] text-ink-soft">{formatDateTime(order.createdAt)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block max-w-[16rem] truncate font-medium">{order.customerName}</span>
                      <span className="block text-[13px] text-ink-soft tabular">{formatPhone(order.customerPhone)}</span>
                    </td>
                    <td className="px-3 py-3 text-ink-soft">{slotText(slot).shortDay}</td>
                    <td className="px-3 py-3 text-right tabular">{order.totalUnits}</td>
                    <td className="px-3 py-3 text-right tabular">{formatCop(order.totalCop)}</td>
                    <td className="px-5 py-3">
                      <OrderStatusPill status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-line md:hidden">
              {rows.map(({ order, slot }) => (
                <li key={order.id}>
                  <Link href={`/admin/pedidos/${order.id}`} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 px-4 py-3 hover:bg-tint/50">
                    <span className="truncate font-medium">{order.customerName}</span>
                    <span className="text-right font-medium tabular">{formatCop(order.totalCop)}</span>
                    <span className="truncate text-[13px] text-ink-soft tabular">
                      {order.code} · {order.totalUnits} u. · {slotText(slot).shortDay}
                    </span>
                    <span className="justify-self-end">
                      <OrderStatusPill status={order.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="px-5 py-8 text-center text-[15px] text-ink-soft">
            {filtered ? "Ningún pedido coincide con estos filtros." : "Todavía no hay pedidos. Cuando alguien agende, aparecerá aquí."}
          </p>
        )}
      </Panel>

      {pages > 1 ? (
        <nav aria-label="Paginación" className="flex items-center justify-between gap-3 text-sm">
          {page > 1 ? (
            <Link href={`/admin/pedidos${query(filters, { pagina: String(page - 1) })}`} className={linkButtonSecondary}>
              Anteriores
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-soft tabular">
            Página {page} de {pages}
          </span>
          {page < pages ? (
            <Link href={`/admin/pedidos${query(filters, { pagina: String(page + 1) })}`} className={linkButtonSecondary}>
              Siguientes
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
