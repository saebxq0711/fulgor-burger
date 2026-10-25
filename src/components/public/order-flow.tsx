"use client";

import { Check, Minus, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formatCop } from "@/lib/money";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { uuidV4 } from "@/lib/uuid";
import { customerNameSchema, whatsappSchema } from "@/lib/validation";
import type { PublicProduct, PublicSlot } from "@/server/services/availability";
import type { OrderReceipt } from "@/server/services/orders";
import { BurgerMark } from "@/components/brand/burger-mark";
import { featuredSlot, useLiveMenu } from "./live-menu";
import { LiveCupo } from "./live-cupo";
import { ProductVisual } from "./product-visual";

type Phase = "form" | "review" | "submitting" | "done";
type Fields = Partial<Record<"slotId" | "items" | "name" | "phone" | "address", string>>;

const RECOVERABLE_SLOT_CODES = new Set(["SOLD_OUT", "SLOT_CLOSED", "SLOT_NOT_OPEN_YET", "SLOT_NOT_FOUND", "PRODUCT_UNAVAILABLE", "TOO_MANY_UNITS"]);

export function OrderFlow() {
  const { menu, refresh, syncError } = useLiveMenu();
  const { settings } = menu;
  const products = menu.products;

  const [phase, setPhase] = useState<Phase>("form");
  const [slotId, setSlotId] = useState<string | null>(() => featuredSlot(menu)?.state === "open" ? featuredSlot(menu)!.id : null);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => (products[0] ? { [products[0].id]: 1 } : {}));
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<Fields>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const phaseHeadingRef = useRef<HTMLHeadingElement>(null);

  const selectedSlot = menu.slots.find((slot) => slot.id === slotId) ?? null;
  const slotIsOpen = selectedSlot?.state === "open";
  const totalUnits = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);
  const unitCap = Math.min(settings.maxUnitsPerOrder, slotIsOpen ? selectedSlot.remaining : settings.maxUnitsPerOrder);
  const lines = useMemo(
    () =>
      products
        .filter((product) => (quantities[product.id] ?? 0) > 0)
        .map((product) => ({ product, quantity: quantities[product.id], total: product.priceCop * quantities[product.id] })),
    [products, quantities],
  );
  const totalCop = lines.reduce((sum, line) => sum + line.total, 0);
  const openSlots = menu.slots.filter((slot) => slot.state === "open");

  // Si la fecha elegida deja de estar disponible mientras el cliente llena el formulario, avisar.
  const staleSlotNotice =
    selectedSlot && selectedSlot.state !== "open"
      ? selectedSlot.state === "soldout"
        ? `Se agotó ${selectedSlot.text.title.toLowerCase()} mientras llenabas el pedido. Elige otra fecha.`
        : `${selectedSlot.text.title} ya no recibe pedidos. Elige otra fecha.`
      : null;
  const shownNotice = notice ?? staleSlotNotice;

  // Mueve el foco al encabezado de cada fase (lectores de pantalla y teclado).
  useEffect(() => {
    if (phase === "review" || phase === "done") {
      phaseHeadingRef.current?.focus({ preventScroll: true });
      topRef.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  }, [phase]);

  function setQuantity(productId: string, next: number) {
    setQuantities((current) => ({ ...current, [productId]: Math.max(0, next) }));
    setErrors((current) => ({ ...current, items: undefined }));
  }

  function validate(): Fields {
    const found: Fields = {};
    if (!selectedSlot) found.slotId = "Elige un día de entrega.";
    else if (!slotIsOpen) found.slotId = "Ese día ya no recibe pedidos. Elige otro.";
    if (totalUnits < 1) found.items = "Elige al menos una hamburguesa.";
    else if (slotIsOpen && totalUnits > selectedSlot.remaining) found.items = `Solo quedan ${selectedSlot.remaining} para ese día.`;
    else if (totalUnits > settings.maxUnitsPerOrder) found.items = `Máximo ${settings.maxUnitsPerOrder} por pedido.`;
    const nameResult = customerNameSchema.safeParse(name);
    if (!nameResult.success) found.name = nameResult.error.issues[0].message;
    const phoneResult = whatsappSchema.safeParse(phone);
    if (!phoneResult.success) found.phone = phoneResult.error.issues[0].message;
    if (settings.requireAddress && address.trim().length < 6) found.address = "Escribe la dirección de entrega.";
    return found;
  }

  function focusFirstError(found: Fields) {
    const order: (keyof Fields)[] = ["slotId", "items", "name", "phone", "address"];
    const first = order.find((key) => found[key]);
    if (!first) return;
    const element = document.querySelector<HTMLElement>(`[data-field="${first}"]`);
    element?.focus();
  }

  async function goToReview(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      focusFirstError(found);
      return;
    }
    // Revalidar cupos con el servidor al abrir el resumen.
    const fresh = await refresh();
    const freshSlot = fresh?.slots.find((slot) => slot.id === slotId);
    if (fresh && (!freshSlot || freshSlot.state !== "open" || freshSlot.remaining < totalUnits)) {
      const message = !freshSlot || freshSlot.state !== "open" ? "Ese día ya no recibe pedidos. Elige otro." : `Solo quedan ${freshSlot.remaining} para ese día.`;
      setErrors({ [!freshSlot || freshSlot.state !== "open" ? "slotId" : "items"]: message });
      return;
    }
    setNotice(null);
    idempotencyKey.current ??= uuidV4();
    setPhase("review");
  }

  async function confirm() {
    if (phase === "submitting") return;
    setPhase("submitting");
    setFormError(null);
    await refresh();
    const key = (idempotencyKey.current ??= uuidV4());
    let response: Response;
    try {
      response = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          idempotencyKey: key,
          slotId,
          items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
          name,
          phone,
          address: settings.requireAddress ? address : undefined,
          website,
        }),
      });
    } catch {
      // Sin respuesta: se conserva la misma clave para que reintentar no duplique el pedido.
      setFormError("No pudimos confirmar si el pedido llegó: revisa tu conexión y vuelve a intentar. Si ya llegó, no se duplicará.");
      setPhase("review");
      return;
    }

    const body = await response.json().catch(() => ({}));
    if (response.ok && body.order) {
      setReceipt(body.order as OrderReceipt);
      setPhase("done");
      void refresh();
      return;
    }

    const code = String(body.code ?? "");
    if (response.status >= 500) {
      setFormError(body.message || "Algo salió mal de nuestro lado. Vuelve a intentarlo en un momento.");
      setPhase("review");
      return;
    }
    // Rechazo definitivo: no se creó nada, la próxima vez se usa una clave nueva.
    idempotencyKey.current = null;
    if (RECOVERABLE_SLOT_CODES.has(code)) {
      await refresh();
      setNotice(body.message);
      setErrors(code === "SOLD_OUT" || code === "TOO_MANY_UNITS" ? { items: body.message } : { slotId: body.message });
      setPhase("form");
      return;
    }
    if (code === "VALIDATION" && body.fields) {
      setErrors(body.fields);
      setPhase("form");
      return;
    }
    setFormError(body.message || "No pudimos registrar el pedido. Inténtalo de nuevo.");
    setPhase(code === "RATE_LIMITED" ? "review" : "form");
  }

  function startOver() {
    idempotencyKey.current = null;
    setReceipt(null);
    setName("");
    setPhone("");
    setAddress("");
    setErrors({});
    setNotice(null);
    setFormError(null);
    setQuantities(products[0] ? { [products[0].id]: 1 } : {});
    const next = featuredSlot(menu);
    setSlotId(next?.state === "open" ? next.id : null);
    setPhase("form");
  }

  const cannotOrder = settings.ordersPaused || products.length === 0 || menu.slots.length === 0;

  return (
    <section id="agendar" aria-labelledby="agendar-title" className="scroll-mt-6">
      <div className="mx-auto grid max-w-[1320px] gap-x-12 gap-y-10 px-4 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-10">
            <h2 id="agendar-title" className="text-balance text-[clamp(2.25rem,6vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.035em]">
              Agenda tu pedido
            </h2>
            <p className="mt-4 max-w-[34ch] text-lg text-cream-dim">Sin registrarte. Solo tu nombre y tu WhatsApp.</p>
            {products[0] ? (
              <div className="mt-10 hidden items-center gap-6 lg:flex">
                <ProductVisual
                  imageUrl={products[0].imageUrl}
                  alt={products[0].imageAlt || products[0].name}
                  sizes="160px"
                  className="w-40 shrink-0"
                />
                <div>
                  <p className="text-xl font-bold">{products[0].name}</p>
                  <p className="mt-1 text-lg font-semibold text-mustard tabular">{formatCop(products[0].priceCop)}</p>
                </div>
              </div>
            ) : null}
            {selectedSlot && phase !== "done" ? (
              <div className="mt-8 hidden rounded-[1.5rem] bg-room-2 p-5 lg:block">
                <LiveCupo slot={selectedSlot} />
              </div>
            ) : null}
          </div>
        </div>

        <div ref={topRef} className="scroll-mt-6 lg:col-span-7">
          {cannotOrder ? (
            <EmptyState paused={settings.ordersPaused} message={settings.pausedMessage} whatsapp={settings.whatsappNumber} />
          ) : phase === "done" && receipt ? (
            <Confirmation receipt={receipt} headingRef={phaseHeadingRef} whatsapp={settings.whatsappNumber} phone={phone} paymentNote={settings.paymentNote} onNewOrder={startOver} />
          ) : phase === "review" || phase === "submitting" ? (
            <Review
              headingRef={phaseHeadingRef}
              slot={selectedSlot}
              lines={lines}
              totalCop={totalCop}
              name={name}
              phone={phone}
              address={settings.requireAddress ? address : null}
              paymentNote={settings.paymentNote}
              confirmsInstantly={settings.initialOrderStatus === "confirmed"}
              submitting={phase === "submitting"}
              error={formError}
              onConfirm={confirm}
              onEdit={() => {
                setFormError(null);
                setPhase("form");
              }}
            />
          ) : (
            <form noValidate onSubmit={goToReview} className="phase-in grid gap-10" aria-describedby={formError ? "form-error" : undefined}>
              {shownNotice ? (
                <div role="alert" className="flex items-start gap-3 rounded-2xl bg-room-3 px-5 py-4 text-cream">
                  <RefreshCw aria-hidden className="mt-0.5 size-5 shrink-0 text-mustard" />
                  <p>{shownNotice}</p>
                </div>
              ) : null}

              <SlotPicker
                slots={menu.slots}
                selectedId={slotId}
                error={errors.slotId}
                onSelect={(id) => {
                  setSlotId(id);
                  setNotice(null);
                  setErrors((current) => ({ ...current, slotId: undefined, items: undefined }));
                  void refresh();
                }}
              />

              <QuantityPicker
                products={products}
                quantities={quantities}
                unitCap={unitCap}
                totalUnits={totalUnits}
                maxPerOrder={settings.maxUnitsPerOrder}
                slot={slotIsOpen ? selectedSlot : null}
                error={errors.items}
                onChange={setQuantity}
              />

              <fieldset className="grid gap-5">
                <legend className="mb-5 text-2xl font-bold tracking-[-0.02em]">Tus datos</legend>
                <TextField
                  label="Nombre"
                  name="name"
                  value={name}
                  onChange={(value) => {
                    setName(value);
                    if (errors.name) setErrors((current) => ({ ...current, name: undefined }));
                  }}
                  autoComplete="name"
                  error={errors.name}
                  maxLength={60}
                />
                <TextField
                  label="WhatsApp"
                  name="phone"
                  value={phone}
                  onChange={(value) => {
                    setPhone(value);
                    if (errors.phone) setErrors((current) => ({ ...current, phone: undefined }));
                  }}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="300 123 4567"
                  hint="Celular con WhatsApp. Si no es de Colombia, escríbelo con su indicativo (+…)."
                  error={errors.phone}
                  maxLength={24}
                />
                {settings.requireAddress ? (
                  <TextField
                    label="Dirección de entrega"
                    name="address"
                    value={address}
                    onChange={(value) => {
                      setAddress(value);
                      if (errors.address) setErrors((current) => ({ ...current, address: undefined }));
                    }}
                    autoComplete="street-address"
                    hint={settings.serviceArea ? `Entregamos en: ${settings.serviceArea}` : undefined}
                    error={errors.address}
                    maxLength={200}
                    multiline
                  />
                ) : null}
                {/* Campo trampa para robots: oculto para personas y lectores de pantalla. */}
                <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label>
                    Sitio web
                    <input tabIndex={-1} autoComplete="off" name="website" value={website} onChange={(event) => setWebsite(event.target.value)} />
                  </label>
                </div>
              </fieldset>

              <div className="grid gap-5 rounded-[1.75rem] bg-room-2 p-5 sm:p-6">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-cream-dim">
                    Total{totalUnits > 0 ? ` · ${totalUnits} ${totalUnits === 1 ? "hamburguesa" : "hamburguesas"}` : ""}
                  </p>
                  <p className="text-2xl font-bold tabular" aria-live="polite">
                    {formatCop(totalCop)}
                  </p>
                </div>
                <button type="submit" className="btn btn-mustard h-14 w-full text-lg" disabled={openSlots.length === 0}>
                  Revisar pedido
                </button>
                <p className="text-sm leading-relaxed text-cream-dim">
                  Usamos tu nombre y tu WhatsApp solo para gestionar este pedido y escribirte sobre él.{" "}
                  <Link href="/privacidad" className="text-cream underline underline-offset-4 hover:text-mustard">
                    Aviso de privacidad
                  </Link>
                  .
                </p>
                {syncError ? <p className="text-sm text-cream-dim">Sin conexión: los cupos pueden no estar al día.</p> : null}
              </div>
              {formError ? (
                <p id="form-error" role="alert" className="text-alert">
                  {formError}
                </p>
              ) : null}
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function SlotPicker({ slots, selectedId, error, onSelect }: { slots: PublicSlot[]; selectedId: string | null; error?: string; onSelect: (id: string) => void }) {
  const errorId = useId();
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="mb-5 text-2xl font-bold tracking-[-0.02em]">¿Para qué día?</legend>
      <div className="grid gap-3" role="radiogroup" aria-label="Día de entrega">
        {slots.map((slot, index) => {
          const disabled = slot.state !== "open";
          const checked = slot.id === selectedId;
          return (
            <label
              key={slot.id}
              className={`group relative flex min-h-[4.5rem] items-center gap-4 rounded-2xl border-2 px-5 py-4 transition-[background-color,border-color] duration-200 ${
                disabled
                  ? "cursor-not-allowed border-room-2 bg-room text-cream-dim"
                  : checked
                    ? "cursor-pointer border-mustard bg-room-3"
                    : "cursor-pointer border-ember-line bg-room-2 hover:border-cream-dim"
              } has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-mustard`}
            >
              <input
                type="radio"
                name="slot"
                value={slot.id}
                checked={checked}
                disabled={disabled}
                onChange={() => onSelect(slot.id)}
                className="sr-only"
                data-field={index === 0 || checked ? "slotId" : undefined}
              />
              <span
                aria-hidden
                className={`grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                  checked ? "border-mustard bg-mustard text-coffee" : disabled ? "border-ember-line" : "border-cream-dim"
                }`}
              >
                {checked ? <Check className="size-4" strokeWidth={3} /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-lg font-semibold leading-tight ${disabled ? "text-cream-dim" : "text-cream"}`}>{slot.text.title}</span>
                <span className="mt-1 block text-base text-cream-dim tabular">
                  {slot.label ? `${slot.text.day} · ` : ""}
                  {slot.text.window}
                </span>
              </span>
              <span className="shrink-0 text-right text-base leading-tight">
                {slot.state === "open" ? (
                  <span className="font-semibold text-mustard tabular">
                    {slot.remaining} {slot.remaining === 1 ? "cupo" : "cupos"}
                  </span>
                ) : slot.state === "soldout" ? (
                  <span className="font-semibold text-cream">Agotado</span>
                ) : slot.state === "upcoming" ? (
                  <span className="text-cream-dim">
                    Abre
                    <br />
                    {slot.text.opens?.split(",").slice(0, 2).join(",")}
                  </span>
                ) : (
                  <span className="text-cream-dim">En pausa</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p id={errorId} className="mt-3 text-alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function QuantityPicker({
  products,
  quantities,
  unitCap,
  totalUnits,
  maxPerOrder,
  slot,
  error,
  onChange,
}: {
  products: PublicProduct[];
  quantities: Record<string, number>;
  unitCap: number;
  totalUnits: number;
  maxPerOrder: number;
  slot: PublicSlot | null;
  error?: string;
  onChange: (productId: string, quantity: number) => void;
}) {
  const errorId = useId();
  const limitText = slot && slot.remaining < maxPerOrder ? `Quedan ${slot.remaining} para este día.` : `Hasta ${maxPerOrder} por pedido.`;
  return (
    <fieldset aria-describedby={error ? errorId : `${errorId}-hint`}>
      <legend className="mb-5 text-2xl font-bold tracking-[-0.02em]">¿Cuántas?</legend>
      <ul className="grid gap-3">
        {products.map((product, index) => {
          const quantity = quantities[product.id] ?? 0;
          const productCap = Math.min(product.maxPerOrder ?? Infinity, quantity + Math.max(0, unitCap - totalUnits));
          return (
            <li key={product.id} className="flex items-center gap-4 rounded-2xl bg-room-2 p-4 sm:p-5">
              <div className="size-14 shrink-0 overflow-hidden rounded-xl">
                {product.imageUrl ? (
                  <ProductVisual imageUrl={product.imageUrl} alt="" sizes="56px" className="!aspect-square !rounded-xl" />
                ) : (
                  <BurgerMark className="size-14 text-mustard" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">{product.name}</p>
                <p className="mt-1 text-cream-dim tabular">{formatCop(product.priceCop)}</p>
              </div>
              <div className="flex items-center gap-1" role="group" aria-label={`Cantidad de ${product.name}`}>
                <button
                  type="button"
                  className="btn btn-ghost-room size-11 min-h-11 bg-room-3 p-0"
                  aria-label={`Quitar una ${product.name}`}
                  disabled={quantity <= 0}
                  onClick={() => onChange(product.id, quantity - 1)}
                  data-field={index === 0 ? "items" : undefined}
                >
                  <Minus aria-hidden className="size-5" strokeWidth={2.5} />
                </button>
                <output aria-live="polite" className="w-10 text-center text-2xl font-bold tabular">
                  <span key={quantity} className="qty-bump inline-block">
                    {quantity}
                  </span>
                </output>
                <button
                  type="button"
                  className="btn btn-ghost-room size-11 min-h-11 bg-room-3 p-0"
                  aria-label={`Agregar una ${product.name}`}
                  disabled={quantity >= productCap}
                  onClick={() => onChange(product.id, quantity + 1)}
                >
                  <Plus aria-hidden className="size-5" strokeWidth={2.5} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p id={errorId} className="mt-3 text-alert">
          {error}
        </p>
      ) : (
        <p id={`${errorId}-hint`} className="mt-3 text-sm text-cream-dim">
          {limitText}
        </p>
      )}
    </fieldset>
  );
}

type TextFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
};

function TextField({ label, name, value, onChange, error, hint, type = "text", inputMode, autoComplete, placeholder, maxLength, multiline }: TextFieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const className = `w-full rounded-2xl border-2 bg-room px-4 text-lg text-cream placeholder:text-cream-dim/80 transition-colors focus:outline-none focus-visible:outline-none focus:border-mustard ${
    error ? "border-alert" : "border-ember-line hover:border-cream-dim"
  }`;
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-base font-semibold">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          name={name}
          value={value}
          rows={2}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          data-field={name}
          className={`${className} min-h-24 py-3`}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          data-field={name}
          className={`${className} h-14`}
        />
      )}
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-cream-dim">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type ReviewProps = {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  slot: PublicSlot | null;
  lines: { product: PublicProduct; quantity: number; total: number }[];
  totalCop: number;
  name: string;
  phone: string;
  address: string | null;
  paymentNote: string;
  confirmsInstantly: boolean;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onEdit: () => void;
};

function Review({ headingRef, slot, lines, totalCop, name, phone, address, paymentNote, confirmsInstantly, submitting, error, onConfirm, onEdit }: ReviewProps) {
  const normalizedPhone = whatsappSchema.safeParse(phone);
  return (
    <div className="phase-in grid gap-8">
      <h3 ref={headingRef} tabIndex={-1} className="text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-tight tracking-[-0.03em] focus:outline-none">
        Revisa tu pedido
      </h3>
      <dl className="grid gap-6 rounded-[1.75rem] bg-room-2 p-5 sm:p-7">
        <ReviewRow term="Día de entrega">
          <span className="block text-lg font-semibold text-cream">{slot?.text.title}</span>
          <span className="text-cream-dim tabular">
            {slot?.label ? `${slot.text.day} · ` : ""}
            {slot?.text.window}
          </span>
        </ReviewRow>
        <ReviewRow term="Pedido">
          <ul className="grid gap-1">
            {lines.map((line) => (
              <li key={line.product.id} className="flex justify-between gap-4 text-lg">
                <span>
                  {line.quantity} × {line.product.name}
                </span>
                <span className="tabular text-cream-dim">{formatCop(line.total)}</span>
              </li>
            ))}
          </ul>
        </ReviewRow>
        <ReviewRow term="Total">
          <span className="text-3xl font-bold text-mustard tabular">{formatCop(totalCop)}</span>
          <span className="mt-1 block text-base text-cream-dim">{paymentNote}</span>
        </ReviewRow>
        <ReviewRow term="A nombre de">
          <span className="text-lg">{name.trim()}</span>
          <span className="block text-cream-dim tabular">WhatsApp {normalizedPhone.success ? formatPhone(normalizedPhone.data) : phone}</span>
          {address ? <span className="mt-1 block text-cream-dim">{address}</span> : null}
        </ReviewRow>
      </dl>
      <p className="text-cream-dim">
        {confirmsInstantly
          ? "Al confirmar, tu pedido queda confirmado y reservamos tus hamburguesas."
          : "Al confirmar, reservamos tus hamburguesas y te escribimos por WhatsApp para confirmar."}
      </p>
      {error ? (
        <p role="alert" className="text-alert">
          {error}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <button type="button" onClick={onConfirm} disabled={submitting} aria-busy={submitting} className="btn btn-mustard h-14 text-lg">
          <span className={`transition-[filter,opacity] duration-200 ${submitting ? "opacity-80 blur-[1px]" : ""}`}>
            {submitting ? "Confirmando…" : `Confirmar pedido · ${formatCop(totalCop)}`}
          </span>
        </button>
        <button type="button" onClick={onEdit} disabled={submitting} className="btn btn-ghost-room h-14 px-7 text-lg">
          Cambiar algo
        </button>
      </div>
    </div>
  );
}

function ReviewRow({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-6">
      <dt className="text-base text-cream-dim">{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

type ConfirmationProps = {
  receipt: OrderReceipt;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  whatsapp: string | null;
  phone: string;
  paymentNote: string;
  onNewOrder: () => void;
};

function Confirmation({ receipt, headingRef, whatsapp, phone, paymentNote, onNewOrder }: ConfirmationProps) {
  const firstName = receipt.customerName.split(" ")[0];
  const normalizedPhone = whatsappSchema.safeParse(phone);
  const confirmed = receipt.status === "confirmed";
  const messageForBusiness = `Hola, agendé el pedido ${receipt.code} para el ${receiptDay(receipt)}.`;
  return (
    <div className="grid gap-8">
      {/* La comanda: el código impreso grande y el sticker oficial del logo como sello. */}
      <div className="ticket-in relative mt-6 rounded-[2rem] bg-mustard p-6 pt-8 text-coffee sm:p-8 sm:pt-10">
        {/* eslint-disable-next-line @next/next/no-img-element -- sticker oficial del logo */}
        <img
          src="/brand/originales/fulgor-icono-negativo.svg"
          alt=""
          width={96}
          height={96}
          className="absolute -top-7 right-5 size-20 rotate-[9deg] rounded-[1.25rem] sm:-top-8 sm:right-8 sm:size-24"
        />
        <h3 ref={headingRef} tabIndex={-1} className="max-w-[16ch] pr-20 text-[clamp(1.6rem,4.6vw,2.5rem)] font-extrabold leading-[0.95] tracking-[-0.03em] focus:outline-none sm:pr-24">
          {confirmed ? `¡Listo, ${firstName}! Tu pedido está confirmado.` : `¡Listo, ${firstName}! Tu pedido quedó agendado.`}
        </h3>
        <p className="mt-8 text-base font-medium">Código de pedido</p>
        <p className="mt-1 whitespace-nowrap text-[clamp(2.25rem,10vw,4.5rem)] font-extrabold leading-none tracking-[0.01em] tabular" aria-label={`Código de pedido ${receipt.code.split("").join(" ")}`}>
          {receipt.code}
        </p>
        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-base font-medium">Entrega</dt>
            <dd className="mt-1 font-semibold">
              {receiptDay(receipt)}
            </dd>
          </div>
          <div>
            <dt className="text-base font-medium">Total</dt>
            <dd className="mt-1 font-semibold tabular">
              {formatCop(receipt.totalCop)} · {receipt.totalUnits} {receipt.totalUnits === 1 ? "hamburguesa" : "hamburguesas"}
            </dd>
          </div>
        </dl>
      </div>
      <div className="grid gap-3 text-lg text-cream-dim">
        <p>
          {confirmed ? "Te escribiremos" : "Te escribiremos para confirmar"} al{" "}
          <span className="text-cream tabular">{normalizedPhone.success ? formatPhone(normalizedPhone.data) : phone}</span> por WhatsApp. Guarda tu código por si necesitas
          cambiar algo.
        </p>
        <p>{paymentNote}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {whatsapp ? (
          <a href={whatsappLink(whatsapp, messageForBusiness)} target="_blank" rel="noopener noreferrer" className="btn btn-mustard h-14 px-7 text-lg">
            Escribirnos por WhatsApp
          </a>
        ) : null}
        <button type="button" onClick={onNewOrder} className="btn btn-ghost-room h-14 px-7 text-lg">
          Hacer otro pedido
        </button>
      </div>
    </div>
  );
}

/** El recibo trae instantes ISO: se formatean aquí, solo en el navegador (no hay SSR de esta vista). */
function receiptDay(receipt: OrderReceipt) {
  const start = new Date(receipt.slot.startsAt);
  const end = new Date(receipt.slot.endsAt);
  const day = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", weekday: "long", day: "numeric", month: "long" }).format(start);
  const time = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit", hour12: true });
  const label = receipt.slot.label ? `${receipt.slot.label} · ` : "";
  return `${label}${day.charAt(0).toUpperCase()}${day.slice(1)}, ${time.format(start)} – ${time.format(end)}`;
}

function EmptyState({ paused, message, whatsapp }: { paused: boolean; message: string | null; whatsapp: string | null }) {
  return (
    <div className="grid gap-4 rounded-[1.75rem] bg-room-2 p-6 sm:p-8">
      <BurgerMark className="size-16 text-ember" />
      <p className="text-2xl font-bold">{paused ? "Pedidos en pausa por ahora" : "No hay fechas abiertas en este momento"}</p>
      <p className="text-lg text-cream-dim">
        {paused ? message || "Volvemos pronto con una nueva tanda." : "Cuando publiquemos la próxima tanda podrás agendar aquí mismo."}
      </p>
      {whatsapp ? (
        <a href={whatsappLink(whatsapp, "Hola, ¿cuándo abren la próxima tanda?")} target="_blank" rel="noopener noreferrer" className="btn btn-mustard h-12 w-fit px-6">
          Preguntar por WhatsApp
        </a>
      ) : null}
    </div>
  );
}
