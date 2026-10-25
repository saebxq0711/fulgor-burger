"use client";

import { CupoMarks } from "@/components/brand/cupo-marks";
import type { PublicSlot } from "@/server/services/availability";
import { RollingNumber } from "./rolling-number";

/** Estado del cupo de una fecha, en texto honesto y con la tira de destellos. */
export function LiveCupo({ slot, headingLevel = "p" }: { slot: PublicSlot; headingLevel?: "p" | "h3" }) {
  const Title = headingLevel;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Title className="text-base font-semibold text-cream">{slot.text.title}</Title>
        <p className="text-sm text-cream-dim tabular">{slot.text.window}</p>
      </div>
      <CupoMarks capacity={slot.capacity} remaining={slot.state === "soldout" ? 0 : slot.remaining} />
      <p className="text-base leading-snug text-cream-dim" aria-live="polite" aria-atomic="true">
        <CupoSentence slot={slot} />
      </p>
    </div>
  );
}

export function CupoSentence({ slot }: { slot: PublicSlot }) {
  switch (slot.state) {
    case "open":
      return (
        <>
          <strong className="font-semibold text-mustard">
            Quedan <RollingNumber value={slot.remaining} /> de {slot.capacity}
          </strong>
          <span className="text-cream-dim">. Pedidos hasta el {sentence(slot.text.closes)}</span>
        </>
      );
    case "soldout":
      return (
        <>
          <strong className="font-semibold text-cream">Agotado.</strong> Las {slot.capacity} de este día ya tienen dueño.
        </>
      );
    case "upcoming":
      return (
        <>
          <strong className="font-semibold text-cream">Abre el {sentence(slot.text.opens ?? "")}</strong> {slot.capacity} cupos.
        </>
      );
    case "paused":
      return <strong className="font-semibold text-cream">Pedidos en pausa para este día.</strong>;
    default:
      return <strong className="font-semibold text-cream">Cerrado.</strong>;
  }
}

/** Minúscula inicial y un solo punto final (las horas ya terminan en "p. m."). */
function sentence(value: string) {
  const text = value.charAt(0).toLowerCase() + value.slice(1);
  return text.endsWith(".") ? text : `${text}.`;
}
