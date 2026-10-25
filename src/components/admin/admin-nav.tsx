"use client";

import { CalendarDays, ClipboardList, ExternalLink, LayoutGrid, Palette, Sandwich, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Resumen", icon: LayoutGrid, exact: true },
  { href: "/admin/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/admin/fechas", label: "Fechas y cupos", icon: CalendarDays },
  { href: "/admin/productos", label: "Productos", icon: Sandwich },
  { href: "/admin/marca", label: "Marca y textos", icon: Palette },
  { href: "/admin/cuenta", label: "Mi cuenta", icon: UserRound },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ variant }: { variant: "sidebar" | "bar" }) {
  const pathname = usePathname();
  if (variant === "bar") {
    return (
      <nav aria-label="Secciones del panel" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
        <ul className="flex w-max gap-1 pb-2">
          {ITEMS.map((item) => {
            const active = isActive(pathname, item.href, "exact" in item && item.exact);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors ${
                    active ? "bg-tint text-ink" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }
  return (
    <nav aria-label="Secciones del panel">
      <ul className="grid gap-0.5">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href, "exact" in item && item.exact);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors ${
                  active ? "bg-tint font-semibold text-ink" : "text-ink-soft hover:bg-tint/60 hover:text-ink"
                }`}
              >
                <Icon aria-hidden className="size-[18px] shrink-0" strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li className="mt-3">
          <Link href="/" target="_blank" className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-[15px] text-ink-soft hover:bg-tint/60 hover:text-ink">
            <ExternalLink aria-hidden className="size-[18px]" strokeWidth={1.75} />
            Ver página pública
          </Link>
        </li>
      </ul>
    </nav>
  );
}
