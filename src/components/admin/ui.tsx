import type { OrderStatus } from "@/server/db/schema";
import type { SlotAvailabilityState } from "@/server/services/availability";

const ORDER_PILL: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Agendado", className: "bg-warn-tint text-warn" },
  confirmed: { label: "Confirmado", className: "bg-info-tint text-info" },
  fulfilled: { label: "Entregado", className: "bg-ok-tint text-ok" },
  cancelled: { label: "Cancelado", className: "bg-tint text-ink-soft line-through decoration-1" },
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  const pill = ORDER_PILL[status];
  return <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[13px] font-medium ${pill.className}`}>{pill.label}</span>;
}

const SLOT_PILL: Record<SlotAvailabilityState, { label: string; className: string }> = {
  open: { label: "Abierta", className: "bg-ok-tint text-ok" },
  soldout: { label: "Agotada", className: "bg-warn-tint text-warn" },
  paused: { label: "En pausa", className: "bg-tint text-ink-soft" },
  upcoming: { label: "Abre pronto", className: "bg-info-tint text-info" },
  closed: { label: "Cerrada", className: "bg-tint text-ink-soft" },
};

export function SlotStatePill({ state }: { state: SlotAvailabilityState }) {
  const pill = SLOT_PILL[state];
  return <span className={`inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[13px] font-medium ${pill.className}`}>{pill.label}</span>;
}

export function PageTitle({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-1">
        <h1 className="text-2xl font-bold tracking-[-0.02em] text-ink">{title}</h1>
        {description ? <p className="text-[15px] text-ink-soft">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ children, className, title, description, actions }: { children: React.ReactNode; className?: string; title?: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className={`rounded-2xl border border-line bg-panel ${className ?? ""}`}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="grid gap-0.5">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {description ? <p className="text-[13px] text-ink-soft">{description}</p> : null}
          </div>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export const linkButton =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-[background-color,transform] duration-150 active:scale-[0.97]";
export const linkButtonPrimary = `${linkButton} bg-coffee text-[#fff8ee] hover:bg-[#4d2e21]`;
export const linkButtonSecondary = `${linkButton} border border-line-strong bg-panel text-ink hover:bg-tint`;
