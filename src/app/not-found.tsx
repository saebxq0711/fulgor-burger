import Link from "next/link";
import { BurgerMark } from "@/components/brand/burger-mark";

export default function NotFound() {
  return (
    <main className="theme-room grid min-h-dvh place-items-center px-4">
      <div className="grid max-w-md justify-items-center gap-6 text-center">
        <BurgerMark className="size-28 text-ember" />
        <h1 className="text-4xl font-extrabold tracking-[-0.03em]">Esta página no existe</h1>
        <p className="text-lg text-cream-dim">Puede que el enlace esté mal escrito.</p>
        <Link href="/" className="btn btn-mustard h-12 px-6">
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
