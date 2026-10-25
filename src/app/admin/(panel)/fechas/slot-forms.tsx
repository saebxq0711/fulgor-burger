"use client";

import { ActionForm, Checkbox, FormError, FormStatus, Select, SubmitButton, TextInput } from "@/components/admin/form-kit";
import type { SlotAvailabilityState } from "@/server/services/availability";
import {
  createSlotAction,
  deleteSlotAction,
  openSlotNowAction,
  saveRuleAction,
  setSlotStatusAction,
  updateSlotAction,
} from "../../actions";

export type SlotFormValues = {
  id: string;
  deliveryDate: string;
  label: string;
  startTime: string;
  endTime: string;
  closeDate: string;
  closeTime: string;
  capacity: number;
};

function SlotFields({ values, minCapacity }: { values?: Partial<SlotFormValues>; minCapacity?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <TextInput name="deliveryDate" label="Día de entrega" type="date" defaultValue={values?.deliveryDate} required />
      <TextInput name="startTime" label="Desde" type="time" defaultValue={values?.startTime ?? "12:00"} required />
      <TextInput name="endTime" label="Hasta" type="time" defaultValue={values?.endTime ?? "18:00"} required />
      <TextInput
        name="capacity"
        label="Cupo (hamburguesas)"
        type="number"
        inputMode="numeric"
        min={minCapacity ?? 0}
        max={5000}
        defaultValue={values?.capacity ?? 20}
        hint={minCapacity ? `Mínimo ${minCapacity}: ya están reservadas.` : undefined}
        required
      />
      <TextInput name="closeDate" label="Cierre de pedidos: día" type="date" defaultValue={values?.closeDate} required />
      <TextInput name="closeTime" label="Cierre: hora" type="time" defaultValue={values?.closeTime ?? "20:00"} required />
      <TextInput name="label" label="Nombre especial (opcional)" defaultValue={values?.label} maxLength={60} placeholder="Ej.: Especial de Halloween" className="sm:col-span-2" />
    </div>
  );
}

export function EditSlotForm({ values, reserved }: { values: SlotFormValues; reserved: number }) {
  return (
    <ActionForm action={updateSlotAction} className="grid gap-4">
      <input type="hidden" name="id" value={values.id} />
      <SlotFields values={values} minCapacity={reserved} />
      <FormError />
      <div className="flex items-center gap-3">
        <SubmitButton>Guardar cambios</SubmitButton>
        <FormStatus />
      </div>
    </ActionForm>
  );
}

export function NewSlotForm() {
  return (
    <ActionForm action={createSlotAction} className="grid gap-4" resetOnSuccess>
      <SlotFields />
      <p className="text-[13px] text-ink-soft">Las fechas especiales abren para pedidos en cuanto las publicas. Todas las horas son de Colombia.</p>
      <FormError />
      <div className="flex items-center gap-3">
        <SubmitButton>Publicar fecha</SubmitButton>
        <FormStatus />
      </div>
    </ActionForm>
  );
}

export function SlotQuickActions({ id, title, state, rawStatus, canDelete }: { id: string; title: string; state: SlotAvailabilityState; rawStatus: "open" | "paused" | "closed"; canDelete: boolean }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      {state === "upcoming" ? (
        <ActionForm action={openSlotNowAction} className="grid gap-1">
          <input type="hidden" name="id" value={id} />
          <SubmitButton variant="secondary">Abrir ya</SubmitButton>
          <FormStatus />
        </ActionForm>
      ) : null}
      {rawStatus === "open" ? (
        <ActionForm action={setSlotStatusAction} className="grid gap-1">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="paused" />
          <SubmitButton variant="secondary">Pausar pedidos</SubmitButton>
          <FormStatus />
        </ActionForm>
      ) : (
        <ActionForm action={setSlotStatusAction} className="grid gap-1">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="open" />
          <SubmitButton variant="secondary">{rawStatus === "paused" ? "Reanudar pedidos" : "Reabrir"}</SubmitButton>
          <FormStatus />
        </ActionForm>
      )}
      {rawStatus !== "closed" ? (
        <ActionForm action={setSlotStatusAction} confirm={`¿Cerrar ${title}? Ya no recibirá pedidos. Los pedidos existentes se conservan.`} className="grid gap-1">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value="closed" />
          <SubmitButton variant="quiet">Cerrar fecha</SubmitButton>
          <FormStatus />
        </ActionForm>
      ) : null}
      {canDelete ? (
        <ActionForm action={deleteSlotAction} confirm={`¿Borrar ${title}? No tiene pedidos. Esta acción no se puede deshacer.`} className="grid gap-1">
          <input type="hidden" name="id" value={id} />
          <SubmitButton variant="danger">Borrar</SubmitButton>
          <FormStatus />
        </ActionForm>
      ) : null}
    </div>
  );
}

export type RuleFormValues = {
  id: string;
  name: string;
  weekday: number;
  startTime: string;
  endTime: string;
  capacity: number;
  openDaysBefore: number;
  openTime: string;
  closeDaysBefore: number;
  closeTime: string;
  weeksAhead: number;
  active: boolean;
};

const WEEKDAY_OPTIONS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((label, value) => ({ label, value: String(value) }));

export function RuleForm({ values }: { values?: RuleFormValues }) {
  return (
    <ActionForm action={saveRuleAction} className="grid gap-5">
      <input type="hidden" name="id" value={values?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextInput name="name" label="Nombre" defaultValue={values?.name ?? "Domingos"} maxLength={60} required />
        <Select name="weekday" label="Día de entrega" defaultValue={String(values?.weekday ?? 0)} options={WEEKDAY_OPTIONS} />
        <TextInput name="startTime" label="Entrega desde" type="time" defaultValue={values?.startTime ?? "12:00"} required />
        <TextInput name="endTime" label="Entrega hasta" type="time" defaultValue={values?.endTime ?? "18:00"} required />
        <TextInput name="capacity" label="Cupo por fecha" type="number" inputMode="numeric" min={1} defaultValue={values?.capacity ?? 20} required />
        <TextInput name="openDaysBefore" label="Abre (días antes)" type="number" inputMode="numeric" min={0} max={13} defaultValue={values?.openDaysBefore ?? 6} hint="6 antes de un domingo = el lunes." required />
        <TextInput name="openTime" label="Abre a las" type="time" defaultValue={values?.openTime ?? "00:00"} required />
        <TextInput name="weeksAhead" label="Fechas publicadas a la vez" type="number" inputMode="numeric" min={1} max={8} defaultValue={values?.weeksAhead ?? 1} required />
        <TextInput name="closeDaysBefore" label="Cierra (días antes)" type="number" inputMode="numeric" min={0} max={13} defaultValue={values?.closeDaysBefore ?? 1} hint="1 antes de un domingo = el sábado." required />
        <TextInput name="closeTime" label="Cierra a las" type="time" defaultValue={values?.closeTime ?? "20:00"} required />
      </div>
      <Checkbox name="active" label="Regla activa" hint="Si la desactivas, no se publican fechas nuevas. Las ya publicadas siguen igual." defaultChecked={values?.active ?? true} />
      <FormError />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>{values ? "Guardar regla" : "Crear regla"}</SubmitButton>
        <FormStatus />
      </div>
    </ActionForm>
  );
}
