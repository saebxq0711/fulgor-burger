import { inArray } from "drizzle-orm";
import { ArrowLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatusPill, Panel, linkButtonPrimary } from "@/components/admin/ui";
import { formatCop } from "@/lib/money";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { formatDateTime } from "@/lib/time";
import { requireAdmin } from "@/server/auth/current";
import { getDb } from "@/server/db/client";
import { adminUsers } from "@/server/db/schema";
import { slotText } from "@/server/services/availability";
import { allowedTransitions, getOrderDetail, ORDER_STATUS_LABELS } from "@/server/services/orders";
import { NotesForm, StatusActions } from "./order-actions";

export const metadata = { title: "Detalle del pedido" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("orders:read");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const db = getDb();
  const detail = await getOrderDetail(db, id);
  if (!detail) notFound();
  const { order, slot, items, events } = detail;
  const text = slotText(slot);
  const actorIds = [...new Set(events.map((event) => event.actorId).filter((value): value is string => Boolean(value)))];
  const actors = actorIds.length ? await db.select({ id: adminUsers.id, name: adminUsers.name }).from(adminUsers).where(inArray(adminUsers.id, actorIds)) : [];
  const actorName = new Map(actors.map((actor) => [actor.id, actor.name]));
  const firstName = order.customerName.split(" ")[0];
  const messageToCustomer = `Hola ${firstName}, te escribimos de Fulgor Burger por tu pedido ${order.code} para el ${text.day.toLowerCase()}.`;

  return (
    <>
      <div className="grid gap-3">
        <Link href="/admin/pedidos" className="inline-flex w-fit items-center gap-1.5 rounded-lg py-1 text-sm text-ink-soft hover:text-ink">
          <ArrowLeft aria-hidden className="size-4" />
          Pedidos
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-[-0.01em] tabular">{order.code}</h1>
          <OrderStatusPill status={order.status} />
        </div>
        <p className="text-[15px] text-ink-soft">Recibido el {formatDateTime(order.createdAt)}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="contents lg:grid lg:content-start lg:gap-6">
          <Panel title="Cliente" className="order-1 lg:order-none">
            <dl className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <dt className="text-[13px] text-ink-soft">Nombre</dt>
                <dd className="font-medium">{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-ink-soft">WhatsApp</dt>
                <dd className="font-medium tabular">{formatPhone(order.customerPhone)}</dd>
              </div>
              {order.deliveryAddress ? (
                <div className="sm:col-span-2">
                  <dt className="text-[13px] text-ink-soft">Dirección</dt>
                  <dd className="font-medium">{order.deliveryAddress}</dd>
                </div>
              ) : null}
            </dl>
            <div className="border-t border-line px-5 py-4">
              <a href={whatsappLink(order.customerPhone, messageToCustomer)} target="_blank" rel="noopener noreferrer" className={linkButtonPrimary}>
                <MessageCircle aria-hidden className="size-4" />
                Escribir por WhatsApp
              </a>
              <p className="mt-2 text-[13px] text-ink-soft">Abre WhatsApp con un mensaje listo para editar. No se envía nada automáticamente.</p>
            </div>
          </Panel>

          <Panel title="Pedido" className="order-3 lg:order-none">
            <div className="p-5">
              <p className="font-medium">{text.title}</p>
              <p className="text-[15px] text-ink-soft tabular">
                {slot.label ? `${text.day} · ` : ""}
                {text.window}
              </p>
            </div>
            <table className="w-full border-t border-line text-[15px]">
              <thead>
                <tr className="text-[13px] text-ink-soft">
                  <th scope="col" className="px-5 py-2 text-left font-medium">Producto</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Cant.</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Precio</th>
                  <th scope="col" className="px-5 py-2 text-right font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line border-t border-line">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">{item.productName}</td>
                    <td className="px-3 py-3 text-right tabular">{item.quantity}</td>
                    <td className="px-3 py-3 text-right tabular">{formatCop(item.unitPriceCop)}</td>
                    <td className="px-5 py-3 text-right tabular">{formatCop(item.lineTotalCop)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-line font-semibold">
                  <td className="px-5 py-3">Total</td>
                  <td className="px-3 py-3 text-right tabular">{order.totalUnits}</td>
                  <td />
                  <td className="px-5 py-3 text-right tabular">{formatCop(order.totalCop)}</td>
                </tr>
              </tfoot>
            </table>
          </Panel>

          <Panel title="Historial" className="order-5 lg:order-none">
            <ol className="grid gap-3 p-5">
              {events.map((event) => (
                <li key={event.id} className="grid gap-0.5 text-[15px]">
                  <span>
                    {event.fromStatus ? `${ORDER_STATUS_LABELS[event.fromStatus]} → ` : "Creado como "}
                    <strong className="font-semibold">{ORDER_STATUS_LABELS[event.toStatus]}</strong>
                  </span>
                  <span className="text-[13px] text-ink-soft">
                    {formatDateTime(event.createdAt)} · {event.actorId ? (actorName.get(event.actorId) ?? "Administrador") : "Cliente (página pública)"}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="contents lg:grid lg:content-start lg:gap-6">
          <Panel title="Estado" description="Cancelar libera los cupos de su fecha." className="order-2 lg:order-none">
            <div className="p-5">
              <StatusActions orderId={order.id} code={order.code} units={order.totalUnits} current={order.status} allowed={allowedTransitions(order.status)} />
            </div>
          </Panel>
          <Panel className="order-4 lg:order-none">
            <div className="p-5">
              <NotesForm orderId={order.id} notes={order.adminNotes ?? ""} />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
