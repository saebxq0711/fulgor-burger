"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { ActionForm, Checkbox, FormError, FormStatus, SubmitButton, TextArea, TextInput } from "@/components/admin/form-kit";
import { createProductAction, moveProductAction, toggleProductAction, updateProductAction } from "../../actions";

export type ProductFormValues = {
  id: string;
  name: string;
  description: string;
  priceCop: number;
  imageAlt: string;
  maxPerOrder: number | null;
  active: boolean;
  imageUrl: string | null;
};

export function ProductForm({ values }: { values?: ProductFormValues }) {
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <ActionForm action={values ? updateProductAction : createProductAction} className="grid gap-6">
      {values ? <input type="hidden" name="id" value={values.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput name="name" label="Nombre" defaultValue={values?.name} maxLength={80} required />
        <TextInput
          name="priceCop"
          label="Precio (COP)"
          inputMode="numeric"
          defaultValue={values ? String(values.priceCop) : ""}
          hint="En pesos, sin puntos ni decimales. Ej.: 28000"
          required
        />
        <TextArea name="description" label="Descripción" defaultValue={values?.description} maxLength={600} className="sm:col-span-2" hint="Aparece bajo el nombre en la página pública." />
        <TextInput
          name="maxPerOrder"
          label="Máximo por pedido (opcional)"
          type="number"
          inputMode="numeric"
          min={1}
          max={50}
          defaultValue={values?.maxPerOrder ?? ""}
          hint="Vacío = usa el límite general de Marca y textos."
        />
        <TextInput name="imageAlt" label="Descripción de la foto" defaultValue={values?.imageAlt} maxLength={160} hint="Para lectores de pantalla. Ej.: Hamburguesa doble con queso fundido." />
      </div>

      <fieldset className="grid gap-3 rounded-xl border border-line p-4">
        <legend className="px-1 text-sm font-semibold">Foto del producto</legend>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid size-28 shrink-0 place-items-center overflow-hidden rounded-xl bg-room">
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local */}
            <img
              src={preview ?? values?.imageUrl ?? "/brand/fulgor-icono-mostaza.svg"}
              alt=""
              className={preview || values?.imageUrl ? "size-full object-cover" : "size-20"}
            />
          </div>
          <div className="grid gap-2 text-[13px] text-ink-soft">
            {!values?.imageUrl && !preview ? (
              <p className="max-w-[46ch] rounded-lg bg-warn-tint px-3 py-2 text-warn">
                Ahora se muestra la ilustración provisional del logo. Sube una foto real del producto para reemplazarla.
              </p>
            ) : null}
            <label className="text-sm font-medium text-ink" htmlFor="image">
              {values?.imageUrl ? "Cambiar foto" : "Subir foto"}
            </label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="text-sm file:mr-3 file:min-h-10 file:rounded-lg file:border file:border-line-strong file:bg-panel file:px-3 file:font-semibold file:text-ink"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : null);
              }}
            />
            <p>JPG, PNG o WebP de hasta 6 MB. Se optimiza y se le quitan los metadatos (como la ubicación).</p>
            {values?.imageUrl ? <Checkbox name="removeImage" label="Quitar la foto y volver a la ilustración" /> : null}
          </div>
        </div>
      </fieldset>

      <Checkbox name="active" label="Visible en la página pública" defaultChecked={values?.active ?? true} hint="Si lo desactivas, nadie puede pedirlo. Los pedidos ya hechos se conservan." />
      <FormError />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>{values ? "Guardar producto" : "Crear producto"}</SubmitButton>
        <FormStatus />
      </div>
    </ActionForm>
  );
}

export function ProductRowActions({ id, name, active, isFirst, isLast }: { id: string; name: string; active: boolean; isFirst: boolean; isLast: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <ActionForm action={moveProductAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="up" />
        <SubmitButton variant="quiet" disabled={isFirst} className="size-10 px-0">
          <ArrowUp aria-hidden className="size-4" />
          <span className="sr-only">Subir {name}</span>
        </SubmitButton>
      </ActionForm>
      <ActionForm action={moveProductAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="direction" value="down" />
        <SubmitButton variant="quiet" disabled={isLast} className="size-10 px-0">
          <ArrowDown aria-hidden className="size-4" />
          <span className="sr-only">Bajar {name}</span>
        </SubmitButton>
      </ActionForm>
      <ActionForm action={toggleProductAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="active" value={active ? "false" : "true"} />
        <SubmitButton variant="secondary">{active ? "Desactivar" : "Activar"}</SubmitButton>
      </ActionForm>
    </div>
  );
}
