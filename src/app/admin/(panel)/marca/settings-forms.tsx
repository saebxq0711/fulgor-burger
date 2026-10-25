"use client";

import { useState } from "react";
import { ActionForm, Checkbox, FormError, FormStatus, Select, SubmitButton, TextArea, TextInput } from "@/components/admin/form-kit";
import { saveLogoAction, saveSettingsAction } from "../../actions";

export type SettingsValues = {
  businessName: string;
  tagline: string;
  whatsappNumber: string;
  contactEmail: string;
  instagramHandle: string;
  addressText: string;
  serviceArea: string;
  paymentNote: string;
  privacyText: string;
  initialOrderStatus: "pending" | "confirmed";
  maxUnitsPerOrder: number;
  requireAddress: boolean;
  ordersPaused: boolean;
  pausedMessage: string;
};

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 border-t border-line pt-6 first:border-t-0 first:pt-0 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-10">
      <div className="grid content-start gap-1">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-[13px] leading-snug text-ink-soft">{description}</p>
      </div>
      <div className="grid gap-4">{children}</div>
    </div>
  );
}

export function SettingsForm({ values }: { values: SettingsValues }) {
  return (
    <ActionForm action={saveSettingsAction} className="grid gap-6">
      <Section title="Pedidos" description="Reglas que el servidor aplica a cada pedido nuevo.">
        <Checkbox
          name="ordersPaused"
          label="Pausar todos los pedidos"
          hint="La página sigue visible pero nadie puede agendar hasta que lo quites."
          defaultChecked={values.ordersPaused}
        />
        <TextInput name="pausedMessage" label="Mensaje durante la pausa (opcional)" defaultValue={values.pausedMessage} maxLength={200} placeholder="Ej.: Volvemos el próximo lunes." />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput name="maxUnitsPerOrder" label="Máximo de hamburguesas por pedido" type="number" inputMode="numeric" min={1} max={50} defaultValue={values.maxUnitsPerOrder} required />
          <Select
            name="initialOrderStatus"
            label="Un pedido nuevo queda…"
            defaultValue={values.initialOrderStatus}
            options={[
              { value: "pending", label: "Agendado (lo confirmas tú por WhatsApp)" },
              { value: "confirmed", label: "Confirmado de inmediato" },
            ]}
          />
        </div>
        <Checkbox name="requireAddress" label="Pedir dirección de entrega" hint="Actívalo solo si haces domicilios. Si no, el formulario pide únicamente nombre y WhatsApp." defaultChecked={values.requireAddress} />
        <TextInput name="paymentNote" label="Cómo se paga" defaultValue={values.paymentNote} maxLength={240} hint="Se muestra en el resumen, la confirmación y las preguntas frecuentes." required />
      </Section>

      <Section title="Negocio y contacto" description="Aparece en la página pública, el contacto y el pie de página.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput name="businessName" label="Nombre del negocio" defaultValue={values.businessName} maxLength={60} required />
          <TextInput name="tagline" label="Frase corta (pie de página)" defaultValue={values.tagline} maxLength={120} placeholder="Hamburguesas por tanda" />
          <TextInput
            name="whatsappNumber"
            label="WhatsApp del negocio"
            type="tel"
            inputMode="tel"
            defaultValue={values.whatsappNumber}
            hint="Activa los botones «Escribir por WhatsApp». Vacío = no se muestran."
          />
          <TextInput name="instagramHandle" label="Instagram" defaultValue={values.instagramHandle} placeholder="usuario, sin @" />
          <TextInput name="contactEmail" label="Correo de contacto (opcional)" type="email" defaultValue={values.contactEmail} />
          <TextInput name="addressText" label="Dirección o punto de recogida (opcional)" defaultValue={values.addressText} maxLength={200} />
          <TextInput name="serviceArea" label="Zona de entrega (opcional)" defaultValue={values.serviceArea} maxLength={200} placeholder="Ej.: Chapinero y Teusaquillo" className="sm:col-span-2" />
        </div>
      </Section>

      <Section title="Aviso de privacidad" description="Texto de /privacidad. Revísalo con tu asesor si tienes dudas legales.">
        <TextArea name="privacyText" label="Texto" defaultValue={values.privacyText} rows={7} maxLength={4000} required />
      </Section>

      <FormError />
      <div className="sticky bottom-0 -mx-5 flex items-center gap-3 border-t border-line bg-panel/95 px-5 py-3">
        <SubmitButton>Guardar cambios</SubmitButton>
        <FormStatus />
      </div>
    </ActionForm>
  );
}

export function LogoForm({ logoUrl }: { logoUrl: string | null }) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <ActionForm action={saveLogoAction} className="grid gap-4">
      <div className="flex flex-wrap items-center gap-5">
        <div className="grid h-20 w-48 place-items-center rounded-xl bg-room px-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- vista previa */}
          <img src={preview ?? logoUrl ?? "/brand/fulgor-wordmark-mostaza.svg"} alt="Logo actual" className="max-h-12 w-auto" />
        </div>
        <div className="grid gap-2 text-[13px] text-ink-soft">
          <p>{logoUrl ? "Estás usando un logo subido." : "Estás usando el logo oficial (wordmark mostaza)."}</p>
          <label htmlFor="logo" className="text-sm font-medium text-ink">
            Subir otro logo
          </label>
          <input
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/webp,image/jpeg"
            className="text-sm file:mr-3 file:min-h-10 file:rounded-lg file:border file:border-line-strong file:bg-panel file:px-3 file:font-semibold file:text-ink"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
          <p>PNG con fondo transparente, versión clara para fondo oscuro. Hasta 6 MB.</p>
        </div>
      </div>
      <FormError />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton variant="secondary">Usar este logo</SubmitButton>
        {logoUrl ? (
          <SubmitButton variant="quiet" name="reset" value="true">
            Volver al logo oficial
          </SubmitButton>
        ) : null}
        <FormStatus />
      </div>
    </ActionForm>
  );
}
