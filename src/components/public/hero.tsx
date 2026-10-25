"use client";

import { formatCop } from "@/lib/money";
import { whatsappLink } from "@/lib/phone";
import { featuredSlot, useLiveMenu } from "./live-menu";
import { LiveCupo } from "./live-cupo";
import { ProductVisual } from "./product-visual";

export function Hero() {
  const { menu } = useLiveMenu();
  const product = menu.products[0];
  const slot = featuredSlot(menu);
  const { settings } = menu;
  const canOrder = !settings.ordersPaused && menu.slots.some((s) => s.state === "open");
  // La regla de la tanda sale de la fecha real: "20 por domingo".
  const batchRule = slot ? `${slot.capacity} por ${slot.text.day.split(",")[0].toLowerCase()}` : null;

  return (
    <section aria-labelledby="hero-title" className="relative">
      <div className="mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-x-10 gap-y-5 px-4 pb-20 pt-1 sm:px-8 lg:grid-cols-12 lg:pb-32 lg:pt-10">
        <div className="mx-auto w-[min(44vw,200px)] sm:w-[min(60vw,380px)] lg:order-2 lg:col-span-6 lg:col-start-7 lg:w-full lg:max-w-[660px]">
          <ProductVisual
            imageUrl={product?.imageUrl ?? null}
            alt={product?.imageAlt || product?.name || settings.businessName}
            sizes="(min-width: 1024px) 660px, 60vw"
            priority
            twinkle
          />
        </div>

        <div className="lg:order-1 lg:col-span-6 lg:row-start-1">
          {product ? (
            <>
              <h1
                id="hero-title"
                className="text-balance text-[clamp(2.9rem,9.5vw,6rem)] font-extrabold leading-[0.9] tracking-[-0.04em] text-cream"
              >
                {product.name}
                {batchRule ? <span className="mt-1 block text-[0.62em] leading-[0.95] tracking-[-0.03em] text-cream-dim">{batchRule}</span> : null}
              </h1>
              {product.description ? (
                <p className="mt-4 max-w-[40ch] text-lg leading-relaxed text-cream-dim sm:mt-6 sm:text-xl">
                  {product.description}
                </p>
              ) : null}
              <p className="mt-4 flex items-baseline gap-3 sm:mt-6">
                <span className="text-[clamp(2rem,5vw,2.5rem)] font-bold leading-none tracking-[-0.02em] text-mustard tabular">
                  {formatCop(product.priceCop)}
                </span>
                <span className="text-lg text-cream-dim">por hamburguesa</span>
              </p>
            </>
          ) : (
            <>
              <h1 id="hero-title" className="text-balance text-[clamp(2.6rem,8vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-cream">
                {settings.businessName}
              </h1>
              <p className="mt-6 max-w-[40ch] text-lg text-cream-dim">Estamos preparando el menú. Vuelve pronto.</p>
            </>
          )}

          <div className="mt-6 rounded-[1.75rem] bg-room-2 p-5 sm:mt-9 sm:p-6">
            {settings.ordersPaused ? (
              <PausedNotice message={settings.pausedMessage} whatsapp={settings.whatsappNumber} />
            ) : slot ? (
              <LiveCupo slot={slot} />
            ) : (
              <NoDatesNotice whatsapp={settings.whatsappNumber} />
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-8">
            {canOrder && product ? (
              <a href="#agendar" className="btn btn-mustard h-14 px-8 text-lg">
                Agendar la mía
              </a>
            ) : null}
            <a href="#como-funciona" className="rounded-full py-2 text-cream underline decoration-ember underline-offset-[0.3em] hover:decoration-mustard">
              Cómo funciona
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function NoDatesNotice({ whatsapp }: { whatsapp: string | null }) {
  return (
    <div className="grid gap-2">
      <p className="text-base font-semibold text-cream">Todavía no hay fechas abiertas.</p>
      <p className="text-[0.95rem] text-cream-dim">
        Publicamos la próxima tanda pronto.
        {whatsapp ? (
          <>
            {" "}
            <a href={whatsappLink(whatsapp, "Hola, ¿cuándo abren la próxima tanda?")} className="text-mustard underline underline-offset-4" target="_blank" rel="noopener noreferrer">
              Pregúntanos por WhatsApp
            </a>
            .
          </>
        ) : null}
      </p>
    </div>
  );
}

function PausedNotice({ message, whatsapp }: { message: string | null; whatsapp: string | null }) {
  return (
    <div className="grid gap-2">
      <p className="text-base font-semibold text-cream">Pedidos en pausa por ahora.</p>
      <p className="text-[0.95rem] text-cream-dim">
        {message || "Volvemos pronto con una nueva tanda."}
        {whatsapp ? (
          <>
            {" "}
            <a href={whatsappLink(whatsapp)} className="text-mustard underline underline-offset-4" target="_blank" rel="noopener noreferrer">
              Escríbenos
            </a>
            .
          </>
        ) : null}
      </p>
    </div>
  );
}
