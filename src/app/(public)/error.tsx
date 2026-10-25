"use client";

import { BurgerMark } from "@/components/brand/burger-mark";

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="grid max-w-md justify-items-center gap-6 text-center">
        <BurgerMark className="size-28 text-ember" />
        <h1 className="text-4xl font-extrabold tracking-[-0.03em]">No pudimos cargar los cupos</h1>
        <p className="text-lg text-cream-dim">Es un problema de nuestro lado. Vuelve a intentarlo en un momento.</p>
        <button type="button" onClick={reset} className="btn btn-mustard h-12 px-6">
          Reintentar
        </button>
      </div>
    </main>
  );
}
