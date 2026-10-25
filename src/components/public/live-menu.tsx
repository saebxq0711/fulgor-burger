"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PublicMenu } from "@/server/services/public-menu";

/** Cada cuánto se vuelve a consultar la disponibilidad mientras la pestaña está visible. */
const POLL_MS = 15_000;

type LiveMenuValue = {
  menu: PublicMenu;
  /** Fuerza una consulta inmediata (al abrir el pedido y antes de confirmar). */
  refresh: () => Promise<PublicMenu | null>;
  syncError: boolean;
};

const LiveMenuContext = createContext<LiveMenuValue | null>(null);

export function LiveMenuProvider({ initial, children }: { initial: PublicMenu; children: React.ReactNode }) {
  const [menu, setMenu] = useState(initial);
  const [syncError, setSyncError] = useState(false);
  const inflight = useRef<Promise<PublicMenu | null> | null>(null);

  const refresh = useCallback(() => {
    if (inflight.current) return inflight.current;
    const request = (async () => {
      try {
        const response = await fetch("/api/availability", { cache: "no-store", headers: { accept: "application/json" } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const body = (await response.json()) as PublicMenu & { ok: boolean };
        const next: PublicMenu = { serverTime: body.serverTime, slots: body.slots, products: body.products, settings: body.settings };
        setMenu(next);
        setSyncError(false);
        return next;
      } catch {
        setSyncError(true);
        return null;
      } finally {
        inflight.current = null;
      }
    })();
    inflight.current = request;
    return request;
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      clearInterval(timer);
      timer = setInterval(() => void refresh(), POLL_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
        start();
      } else {
        clearInterval(timer);
      }
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onVisibility);
    };
  }, [refresh]);

  const value = useMemo(() => ({ menu, refresh, syncError }), [menu, refresh, syncError]);
  return <LiveMenuContext value={value}>{children}</LiveMenuContext>;
}

export function useLiveMenu() {
  const value = useContext(LiveMenuContext);
  if (!value) throw new Error("useLiveMenu debe usarse dentro de LiveMenuProvider");
  return value;
}

/** La fecha que se destaca: la primera abierta; si no hay, la primera publicada. */
export function featuredSlot(menu: PublicMenu) {
  return menu.slots.find((slot) => slot.state === "open") ?? menu.slots[0] ?? null;
}
