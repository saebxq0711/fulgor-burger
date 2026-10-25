import Link from "next/link";
import { CupoMarks } from "@/components/brand/cupo-marks";
import { OrderStatusPill, PageTitle, Panel, SlotStatePill, linkButtonSecondary } from "@/components/admin/ui";
import { formatCop } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { requireAdmin } from "@/server/auth/current";
import { getDb } from "@/server/db/client";
import { slotText } from "@/server/services/availability";
import { getDashboard } from "@/server/services/dashboard";
import { unreviewedSampleProduct } from "@/server/services/products";
import { formatDateTime } from "@/lib/time";

export const metadata = { title: "Resumen" };

export default async function DashboardPage() {
  await requireAdmin("orders:read");
  const db = getDb();
  const [{ upcoming, recent, pendingCount, totals }, sample] = await Promise.all([getDashboard(db), unreviewedSampleProduct(db)]);
  const next = upcoming[0];
  const others = upcoming.slice(1);

  return (
    <>
      <PageTitle title="Resumen" description="Cómo va la próxima tanda y qué pedidos llegaron." />

      {sample ? (
        <Link href={`/admin/productos/${sample.id}`} className="flex items-center justify-between gap-4 rounded-2xl bg-warn-tint px-5 py-4 text-sm text-warn hover:bg-[#fbe7bd]">
          <span>
            <strong className="font-semibold">Revisa el producto de ejemplo.</strong> «{sample.name}», su descripción y el precio de {formatCop(sample.priceCop)} vienen
            de la instalación inicial y los clientes ya los ven. Edítalos con los datos reales.
          </span>
          <span aria-hidden>→</span>
        </Link>
      ) : null}

      {next ? (
        <Panel className="overflow-hidden">
          <div className="grid gap-6 p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1">
                <p className="text-[13px] text-ink-soft">Próxima entrega</p>
                <h2 className="text-xl font-bold tracking-[-0.01em] text-ink sm:text-2xl">{slotText(next.slot).title}</h2>
                <p className="text-[15px] text-ink-soft tabular">
                  {next.slot.label ? `${slotText(next.slot).day} · ` : ""}
                  {slotText(next.slot).window} · cierra {slotText(next.slot).closes.toLowerCase()}
                </p>
              </div>
              <SlotStatePill state={next.state} />
            </div>
            <CupoMarks capacity={next.slot.capacity} remaining={next.slot.capacity - next.reserved} tone="paper" />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <Figure label="Reservadas" value={`${next.reserved} de ${next.slot.capacity}`} />
              <Figure label="Libres" value={String(Math.max(0, next.slot.capacity - next.reserved))} />
              <Figure label="Pedidos" value={String(next.orderCount)} />
              <Figure label="Total a cobrar" value={formatCop(next.revenue)} />
            </dl>
            <div className="flex flex-wrap gap-2">
              <Link href={`/admin/pedidos?fecha=${next.slot.id}`} className={linkButtonSecondary}>
                Ver pedidos de esta fecha
              </Link>
              <Link href="/admin/fechas" className={linkButtonSecondary}>
                Ajustar cupo o cierre
              </Link>
            </div>
          </div>
          {pendingCount > 0 ? (
            <Link href="/admin/pedidos?estado=pending" className="flex items-center justify-between gap-4 border-t border-line bg-warn-tint/60 px-5 py-3 text-sm font-medium text-warn hover:bg-warn-tint sm:px-7">
              <span>
                {pendingCount} {pendingCount === 1 ? "pedido agendado espera" : "pedidos agendados esperan"} tu confirmación por WhatsApp
              </span>
              <span aria-hidden>→</span>
            </Link>
          ) : null}
        </Panel>
      ) : (
        <Panel>
          <div className="grid gap-3 p-6">
            <p className="font-semibold text-ink">No hay fechas próximas publicadas.</p>
            <p className="text-sm text-ink-soft">Los clientes ven un aviso amable y no pueden reservar. Activa la regla semanal o crea una fecha especial.</p>
            <Link href="/admin/fechas" className={`${linkButtonSecondary} w-fit`}>
              Ir a fechas y cupos
            </Link>
          </div>
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Pedidos recientes" actions={<Link href="/admin/pedidos" className="text-sm font-medium text-ink-soft hover:text-ink">Ver todos</Link>}>
          {recent.length ? (
            <ul className="divide-y divide-line">
              {recent.map(({ order, slot }) => (
                <li key={order.id}>
                  <Link href={`/admin/pedidos/${order.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-tint/50">
                    <span className="truncate font-medium text-ink">{order.customerName}</span>
                    <span className="text-right font-medium text-ink tabular">{formatCop(order.totalCop)}</span>
                    <span className="truncate text-[13px] text-ink-soft tabular">
                      {order.code} · {order.totalUnits} u. · {slotText(slot).shortDay} · {formatPhone(order.customerPhone)}
                    </span>
                    <span className="justify-self-end">
                      <OrderStatusPill status={order.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-ink-soft">Todavía no hay pedidos. Cuando alguien agende, aparecerá aquí.</p>
          )}
        </Panel>

        <Panel title="Próximas fechas">
          {others.length ? (
            <ul className="divide-y divide-line">
              {others.map((row) => (
                <li key={row.slot.id} className="grid gap-2 px-5 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-ink">{slotText(row.slot).title}</span>
                    <SlotStatePill state={row.state} />
                  </div>
                  <CupoMarks capacity={row.slot.capacity} remaining={row.slot.capacity - row.reserved} tone="paper" size="sm" />
                  <span className="text-[13px] text-ink-soft tabular">
                    {row.reserved} de {row.slot.capacity} reservadas · {formatCop(row.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-ink-soft">Solo está publicada la próxima fecha. Las siguientes se publican solas cada semana.</p>
          )}
          <p className="border-t border-line px-5 py-3 text-[13px] text-ink-soft tabular">
            Histórico: {totals.orders} pedidos activos o entregados · {totals.units} hamburguesas · {formatCop(totals.revenue)}
          </p>
        </Panel>
      </div>
      <p className="text-[13px] text-ink-soft">Actualizado {formatDateTime(new Date())} (hora de Colombia). Recarga para ver lo más reciente.</p>
    </>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-[13px] text-ink-soft">{label}</dt>
      <dd className="text-xl font-bold text-ink tabular sm:text-2xl">{value}</dd>
    </div>
  );
}
