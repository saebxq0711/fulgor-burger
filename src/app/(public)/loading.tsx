import { BurgerMark } from "@/components/brand/burger-mark";

export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-live="polite">
      <BurgerMark className="size-20 text-ember" />
      <span className="sr-only">Cargando cupos…</span>
    </div>
  );
}
