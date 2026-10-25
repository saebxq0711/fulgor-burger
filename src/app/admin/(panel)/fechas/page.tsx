import { inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { CupoMarks } from "@/components/brand/cupo-marks";
import { PageTitle, Panel, SlotStatePill } from "@/components/admin/ui";
import { businessDateString, businessTimeString, WEEKDAYS } from "@/lib/time";
import { requireAdmin } from "@/server/auth/current";
import { getDb } from "@/server/db/client";
import { orders } from "@/server/db/schema";
import { slotState, slotText } from "@/server/services/availability";
import { listRules, listSlotsForAdmin } from "@/server/services/slots";
import { EditSlotForm, NewSlotForm, RuleForm, SlotQuickActions } from "./slot-forms";

export const metadata = { title: "Fechas y cupos" };

export default async function SlotsPage() {
  await requireAdmin("schedule:write");
  const db = getDb();
  const now = new Date();
  const [{ upcoming, past }, rules] = await Promise.all([listSlotsForAdmin(db, now), listRules(db)]);
  const ids = [...upcoming, ...past].map((row) => row.slot.id);
  const withOrders = ids.length
    ? new Set(
        (await db.select({ slotId: orders.slotId }).from(orders).where(inArray(orders.slotId, ids)).groupBy(orders.slotId).having(sql`count(*) > 0`)).map(
          (row) => row.slotId,
        ),
      )
    : new Set<string>();

  return (
    <>
      <PageTitle title="Fechas y cupos" description="Cada fecha tiene su propio cupo. Las horas son de Colombia (America/Bogota)." />

      <section aria-labelledby="proximas" className="grid gap-4">
        <h2 id="proximas" className="text-lg font-semibold">
          Próximas fechas
        </h2>
        {upcoming.length ? (
          upcoming.map(({ slot, reserved }) => {
            const state = slotState(slot, reserved, now);
            const text = slotText(slot);
            return (
              <Panel key={slot.id}>
                <div className="grid gap-5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="grid gap-1">
                      <h3 className="text-lg font-bold">{text.title}</h3>
                      <p className="text-[15px] text-ink-soft tabular">
                        {slot.label ? `${text.day} · ` : ""}
                        {text.window}
                      </p>
                      <p className="text-[13px] text-ink-soft">
                        {text.opens && slot.opensAt && slot.opensAt > now ? `Abre el ${text.opens.toLowerCase()} · ` : ""}
                        Cierra el {text.closes.toLowerCase()}
                        {slot.ruleId ? " · Regla semanal" : " · Fecha especial"}
                      </p>
                    </div>
                    <SlotStatePill state={state} />
                  </div>
                  <CupoMarks capacity={slot.capacity} remaining={slot.capacity - reserved} tone="paper" />
                  <p className="text-[15px] tabular">
                    <strong className="font-semibold">{reserved}</strong> de {slot.capacity} reservadas ·{" "}
                    <strong className="font-semibold">{Math.max(0, slot.capacity - reserved)}</strong> libres ·{" "}
                    <Link href={`/admin/pedidos?fecha=${slot.id}`} className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                      ver pedidos
                    </Link>
                  </p>
                  <SlotQuickActions id={slot.id} title={text.title} state={state} rawStatus={slot.status} canDelete={!withOrders.has(slot.id)} />
                  <details className="group rounded-xl border border-line">
                    <summary className="flex min-h-11 items-center px-4 text-sm font-semibold marker:content-none">
                      <span className="mr-2 inline-block transition-transform duration-200 group-open:rotate-90" aria-hidden>
                        ›
                      </span>
                      Editar horario, cierre o cupo
                    </summary>
                    <div className="border-t border-line p-4">
                      <EditSlotForm
                        reserved={reserved}
                        values={{
                          id: slot.id,
                          deliveryDate: slot.deliveryDate,
                          label: slot.label ?? "",
                          startTime: businessTimeString(slot.startsAt),
                          endTime: businessTimeString(slot.endsAt),
                          closeDate: businessDateString(slot.closesAt),
                          closeTime: businessTimeString(slot.closesAt),
                          capacity: slot.capacity,
                        }}
                      />
                    </div>
                  </details>
                </div>
              </Panel>
            );
          })
        ) : (
          <Panel>
            <p className="p-5 text-[15px] text-ink-soft">
              No hay fechas próximas. La página pública muestra un aviso y no deja reservar. Revisa que la regla semanal esté activa o publica una fecha especial.
            </p>
          </Panel>
        )}
      </section>

      <Panel title="Publicar una fecha especial" description="Un festivo, un evento o un día extra. No reemplaza la regla semanal.">
        <div className="p-5">
          <NewSlotForm />
        </div>
      </Panel>

      <section aria-labelledby="regla" className="grid gap-4">
        <div className="grid gap-1">
          <h2 id="regla" className="text-lg font-semibold">
            Regla semanal
          </h2>
          <p className="max-w-[70ch] text-[15px] text-ink-soft">
            Publica sola la siguiente fecha cada semana, con su cupo nuevo. Las fechas pasadas y sus pedidos se conservan. Los cambios aplican a las fechas que se publiquen
            desde ahora; las ya publicadas se editan arriba.
          </p>
        </div>
        {rules.map((rule) => (
          <Panel key={rule.id} title={rule.name} description={`Cada ${WEEKDAYS[rule.weekday]} · ${rule.active ? "Activa" : "Desactivada"}`}>
            <div className="p-5">
              <RuleForm values={rule} />
            </div>
          </Panel>
        ))}
        {rules.length === 0 ? (
          <Panel title="Crear regla semanal">
            <div className="p-5">
              <RuleForm />
            </div>
          </Panel>
        ) : (
          <details className="group rounded-2xl border border-line bg-panel">
            <summary className="flex min-h-12 items-center px-5 text-sm font-semibold marker:content-none">
              <span className="mr-2 inline-block transition-transform duration-200 group-open:rotate-90" aria-hidden>
                ›
              </span>
              Añadir otra regla (otro día de la semana)
            </summary>
            <div className="border-t border-line p-5">
              <RuleForm />
            </div>
          </details>
        )}
      </section>

      <Panel title="Historial de fechas" description="Fechas que ya pasaron, con lo que se vendió.">
        {past.length ? (
          <ul className="divide-y divide-line">
            {past.map(({ slot, reserved }) => (
              <li key={slot.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[15px]">
                <span>{slotText(slot).title}</span>
                <span className="text-ink-soft tabular">
                  {reserved} de {slot.capacity} ·{" "}
                  <Link href={`/admin/pedidos?fecha=${slot.id}`} className="underline decoration-line-strong underline-offset-4 hover:text-ink">
                    pedidos
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-[15px] text-ink-soft">Aún no hay fechas pasadas.</p>
        )}
      </Panel>
    </>
  );
}
