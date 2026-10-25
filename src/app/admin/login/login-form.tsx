"use client";

import { useActionState } from "react";
import { loginAction, type ActionResult } from "../actions";

const fieldClass =
  "h-13 w-full rounded-2xl border-2 border-ember-line bg-room-2 px-4 text-lg text-cream transition-colors hover:border-cream-dim focus:border-mustard focus:outline-none";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(loginAction, { ok: true });
  return (
    <form action={action} className="grid gap-5">
      <div className="grid gap-2">
        <label htmlFor="email" className="font-semibold">
          Correo
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required className={fieldClass} />
      </div>
      <div className="grid gap-2">
        <label htmlFor="password" className="font-semibold">
          Contraseña
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={fieldClass} />
      </div>
      {!state.ok && state.message ? (
        <p role="alert" className="text-alert">
          {state.message}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn btn-mustard h-14 text-lg">
        {pending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
