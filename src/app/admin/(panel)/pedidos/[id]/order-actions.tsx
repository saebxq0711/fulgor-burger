"use client";

import { ActionForm, FormStatus, SubmitButton, TextArea } from "@/components/admin/form-kit";
import type { OrderStatus } from "@/server/db/schema";
import { changeOrderStatusAction, saveOrderNotesAction } from "../../../actions";

const LABELS: Record<OrderStatus, string> = {
  pending: "Volver a agendado",
  confirmed: "Marcar confirmado",
  fulfilled: "Marcar entregado",
  cancelled: "Cancelar pedido",
};

/**
 * Un solo formulario con un botón por transición permitida. El formulario no se desmonta al
 * cambiar de estado, así el mensaje de resultado sigue visible.
 */
export function StatusActions({ orderId, code, units, current, allowed }: { orderId: string; code: string; units: number; current: OrderStatus; allowed: OrderStatus[] }) {
  const ordered = (["confirmed", "fulfilled", "pending", "cancelled"] as OrderStatus[]).filter((status) => allowed.includes(status));
  const cupos = `${units} ${units === 1 ? "cupo" : "cupos"}`;
  return (
    <ActionForm action={changeOrderStatusAction} className="grid gap-2">
      <input type="hidden" name="id" value={orderId} />
      {ordered.map((to) => (
        <SubmitButton
          key={to}
          name="to"
          value={to}
          variant={to === "cancelled" ? "danger" : to === "confirmed" || to === "fulfilled" ? "primary" : "secondary"}
          className="w-full"
          confirm={
            to === "cancelled"
              ? `¿Cancelar el pedido ${code}? Se liberarán ${cupos} de su fecha.`
              : current === "cancelled"
                ? `¿Reactivar el pedido ${code}? Volverá a ocupar ${cupos} si hay disponibles.`
                : undefined
          }
        >
          {current === "cancelled" && to !== "cancelled" ? `Reactivar como ${to === "pending" ? "agendado" : "confirmado"}` : LABELS[to]}
        </SubmitButton>
      ))}
      <FormStatus className="justify-center" />
    </ActionForm>
  );
}

export function NotesForm({ orderId, notes }: { orderId: string; notes: string }) {
  return (
    <ActionForm action={saveOrderNotesAction} className="grid gap-3">
      <input type="hidden" name="id" value={orderId} />
      <TextArea name="notes" label="Notas internas" hint="Solo las ve el equipo. Ej.: pagó por transferencia, sin cebolla." defaultValue={notes} maxLength={1000} />
      <div className="flex items-center gap-3">
        <SubmitButton variant="secondary">Guardar notas</SubmitButton>
        <FormStatus />
      </div>
    </ActionForm>
  );
}
