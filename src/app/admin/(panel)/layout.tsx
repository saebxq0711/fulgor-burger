import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/server/auth/current";
import { logoutAction } from "../actions";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel Fulgor" },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="theme-paper min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden border-r border-line lg:flex lg:min-h-dvh lg:flex-col lg:justify-between lg:px-4 lg:py-6">
        <div className="grid gap-8">
          <Brand />
          <AdminNav variant="sidebar" />
        </div>
        <div className="grid gap-2 border-t border-line pt-4">
          <p className="truncate px-3 text-sm text-ink-soft" title={user.email}>
            {user.name}
          </p>
          <form action={logoutAction}>
            <button type="submit" className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-[15px] text-ink-soft hover:bg-tint/60 hover:text-ink">
              <LogOut aria-hidden className="size-[18px]" strokeWidth={1.75} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/95 px-4 pt-3 lg:hidden">
          <div className="mb-2 flex items-center justify-between">
            <Brand />
            <form action={logoutAction}>
              <button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-ink-soft hover:bg-tint">
                <LogOut aria-hidden className="size-4" />
                Salir
              </button>
            </form>
          </div>
          <AdminNav variant="bar" />
        </header>
        <main id="contenido" className="mx-auto grid max-w-[1180px] gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <a href="/admin" className="flex items-center gap-3 rounded-lg px-1 lg:px-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- icono oficial */}
      <img src="/brand/originales/fulgor-icono-positivo.svg" alt="" width={36} height={36} className="size-9 rounded-lg" />
      <span className="grid leading-tight">
        <span className="text-[15px] font-bold text-ink">Fulgor Burger</span>
        <span className="text-[13px] text-ink-soft">Panel</span>
      </span>
    </a>
  );
}
