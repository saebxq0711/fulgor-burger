"use client";

import { Check, LoaderCircle } from "lucide-react";
import { createContext, startTransition, useActionState, useContext, useEffect, useId, useRef, useState } from "react";
import type { ActionResult } from "@/app/admin/actions";

type Action = (prev: ActionResult, form: FormData) => Promise<ActionResult>;

type FormState = { result: ActionResult; pending: boolean };
const FormContext = createContext<FormState>({ result: { ok: true }, pending: false });

const INITIAL: ActionResult = { ok: true };

type ActionFormProps = {
  action: Action;
  children: React.ReactNode;
  className?: string;
  /** Muestra el mensaje de resultado junto al botón (por defecto sí). */
  showStatus?: boolean;
  /** Pide confirmación antes de enviar (acciones destructivas). */
  confirm?: string;
  resetOnSuccess?: boolean;
  "aria-label"?: string;
};

/**
 * Formulario conectado a una acción de servidor. Se envía dentro de una transición para que
 * React no limpie los campos cuando hay errores de validación.
 */
export function ActionForm({ action, children, className, confirm, resetOnSuccess, ...rest }: ActionFormProps) {
  const [result, formAction, pending] = useActionState(action, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (resetOnSuccess && result.ok && result.at) formRef.current?.reset();
  }, [result, resetOnSuccess]);

  return (
    <FormContext value={{ result, pending }}>
      <form
        ref={formRef}
        noValidate
        className={className}
        aria-label={rest["aria-label"]}
        onSubmit={(event) => {
          event.preventDefault();
          const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          const question = submitter?.dataset.confirm || confirm;
          if (question && !window.confirm(question)) return;
          const data = new FormData(event.currentTarget, submitter);
          startTransition(() => formAction(data));
        }}
      >
        {children}
      </form>
    </FormContext>
  );
}

export function useFormResult() {
  return useContext(FormContext);
}

/** Mensaje del último envío: "Guardado" discreto o el error en texto. */
export function FormStatus({ className }: { className?: string }) {
  const { result, pending } = useFormResult();
  // El "Guardado" se oculta solo a los 4 s; los errores se quedan hasta el siguiente envío.
  const [hiddenAt, setHiddenAt] = useState<number | undefined>();
  useEffect(() => {
    if (!result.at || !result.ok) return;
    const timer = setTimeout(() => setHiddenAt(result.at), 4000);
    return () => clearTimeout(timer);
  }, [result]);
  const visible = Boolean(result.at) && hiddenAt !== result.at;
  if (pending || !result.at || !visible || !result.message) return <span role="status" aria-live="polite" className={className} />;
  return (
    <span role="status" aria-live="polite" className={`inline-flex items-center gap-1.5 text-sm ${result.ok ? "text-ok" : "text-danger"} ${className ?? ""}`}>
      {result.ok ? <Check aria-hidden className="size-4" /> : null}
      {result.message}
    </span>
  );
}

type SubmitProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "quiet";
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  /** Pregunta de confirmación solo para este botón. */
  confirm?: string;
};

const VARIANTS: Record<NonNullable<SubmitProps["variant"]>, string> = {
  primary: "bg-coffee text-[#fff8ee] hover:bg-[#4d2e21]",
  secondary: "border border-line-strong bg-panel text-ink hover:bg-tint",
  danger: "border border-[#e7b4af] bg-panel text-danger hover:bg-danger-tint",
  quiet: "text-ink-soft hover:bg-tint hover:text-ink",
};

export function SubmitButton({ children, variant = "primary", className, name, value, disabled, confirm }: SubmitProps) {
  const { pending } = useFormResult();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      data-confirm={confirm}
      disabled={pending || disabled}
      aria-busy={pending}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition-[background-color,transform,opacity] duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className ?? ""}`}
    >
      {pending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

type FieldBase = {
  name: string;
  label: string;
  hint?: string;
  className?: string;
};

function useFieldError(name: string) {
  const { result } = useFormResult();
  return result.ok ? undefined : result.fields?.[name];
}

const inputClass =
  "w-full rounded-lg border bg-panel px-3 text-[15px] text-ink placeholder:text-ink-soft/60 transition-colors focus:border-coffee focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coffee";

function FieldShell({ id, label, hint, error, className, children }: { id: string; label: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`grid content-start gap-1.5 ${className ?? ""}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-[13px] leading-snug text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type InputProps = FieldBase & Omit<React.InputHTMLAttributes<HTMLInputElement>, "name" | "className">;

export function TextInput({ name, label, hint, className, ...props }: InputProps) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${inputClass} h-10 ${error ? "border-danger" : "border-line-strong"}`}
        {...props}
      />
    </FieldShell>
  );
}

type TextAreaProps = FieldBase & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "name" | "className">;

export function TextArea({ name, label, hint, className, ...props }: TextAreaProps) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <textarea
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${inputClass} min-h-24 py-2 leading-relaxed ${error ? "border-danger" : "border-line-strong"}`}
        {...props}
      />
    </FieldShell>
  );
}

type SelectProps = FieldBase & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "name" | "className"> & { options: { value: string; label: string }[] };

export function Select({ name, label, hint, className, options, ...props }: SelectProps) {
  const id = useId();
  const error = useFieldError(name);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <select
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`${inputClass} h-10 ${error ? "border-danger" : "border-line-strong"}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Checkbox({ name, label, hint, defaultChecked, className }: FieldBase & { defaultChecked?: boolean }) {
  const id = useId();
  return (
    <div className={`flex items-start gap-3 ${className ?? ""}`}>
      <input
        id={id}
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="mt-0.5 size-5 shrink-0 accent-[#3b2218]"
      />
      <div className="grid gap-0.5">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {hint ? (
          <p id={`${id}-hint`} className="text-[13px] leading-snug text-ink-soft">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Error general del formulario cuando no corresponde a un campo. */
export function FormError() {
  const { result } = useFormResult();
  if (result.ok || !result.message || !result.at) return null;
  return (
    <p role="alert" className="rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger">
      {result.message}
    </p>
  );
}
