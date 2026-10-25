import Link from "next/link";
import { whatsappLink } from "@/lib/phone";
import type { PublicMenu } from "@/server/services/public-menu";

const sectionTitle = "text-balance text-[clamp(2.25rem,6vw,4rem)] font-extrabold leading-[0.95] tracking-[-0.035em]";

/** Paso a paso real del pedido; el último paso cambia según el estado inicial configurado. */
export function HowItWorks({ menu }: { menu: PublicMenu }) {
  const capacity = menu.slots[0]?.capacity;
  const steps = [
    {
      lead: "Eliges el día y cuántas.",
      text: capacity
        ? `Cada fecha tiene su propia tanda de ${capacity}. Ves en vivo cuántas quedan; cuando se acaban, se acaban.`
        : "Cada fecha tiene su propia tanda. Ves en vivo cuántas quedan; cuando se acaban, se acaban.",
    },
    {
      lead: "Dejas tu nombre y tu WhatsApp.",
      text: "Nada de cuentas ni contraseñas. Revisas el resumen, confirmas y te llevas un código de pedido.",
    },
    {
      lead: menu.settings.initialOrderStatus === "confirmed" ? "Te escribimos antes de la entrega." : "Te escribimos para confirmar.",
      text: menu.settings.paymentNote,
    },
  ];
  return (
    <section id="como-funciona" aria-labelledby="como-funciona-title" className="scroll-mt-6">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 sm:px-8 lg:grid-cols-12 lg:gap-8">
        <h2 id="como-funciona-title" className={`${sectionTitle} lg:col-span-5`}>
          Cómo funciona
        </h2>
        <ol className="grid gap-9 lg:col-span-6 lg:col-start-7">
          {steps.map((step) => (
            <li key={step.lead} className="grid gap-2">
              <p className="text-[clamp(1.25rem,2.2vw,1.6rem)] font-bold leading-tight tracking-[-0.02em]">{step.lead}</p>
              <p className="max-w-[44ch] text-lg leading-relaxed text-cream-dim">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Preguntas frecuentes construidas con la configuración real (nada inventado). */
export function Faq({ menu }: { menu: PublicMenu }) {
  const { settings } = menu;
  const slot = menu.slots.find((s) => s.state === "open") ?? menu.slots[0];
  const items: { q: string; a: React.ReactNode }[] = [];

  items.push({
    q: "¿Hasta cuándo puedo pedir?",
    a: slot ? (
      <>
        Para el {slot.text.title.toLowerCase()}, hasta el {slot.text.closes.toLowerCase()} o hasta que se acaben los cupos, lo que pase primero. Cada fecha tiene su
        propio cupo.
      </>
    ) : (
      "Cada fecha tiene una hora de cierre y su propio cupo. En cuanto publiquemos la próxima, la verás arriba."
    ),
  });
  items.push({
    q: "¿Cuántas puedo pedir?",
    a: `Hasta ${settings.maxUnitsPerOrder} por pedido, siempre que queden cupos ese día.${settings.whatsappNumber ? " Si necesitas más, escríbenos." : ""}`,
  });
  items.push({ q: "¿Cómo pago?", a: settings.paymentNote });
  if (settings.serviceArea) items.push({ q: "¿Dónde entregan?", a: settings.serviceArea });
  items.push({
    q: "¿Puedo cambiar o cancelar mi pedido?",
    a: settings.whatsappNumber ? (
      <>
        Escríbenos por{" "}
        <a href={whatsappLink(settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="text-cream underline underline-offset-4 hover:text-mustard">
          WhatsApp
        </a>{" "}
        con tu código de pedido y lo revisamos contigo.
      </>
    ) : (
      "Contáctanos con tu código de pedido y lo revisamos contigo."
    ),
  });
  items.push({
    q: "¿Qué hacen con mis datos?",
    a: (
      <>
        Solo usamos tu nombre y tu WhatsApp para gestionar el pedido y escribirte sobre él.{" "}
        <Link href="/privacidad" className="text-cream underline underline-offset-4 hover:text-mustard">
          Lee el aviso de privacidad
        </Link>
        .
      </>
    ),
  });

  return (
    <section id="preguntas" aria-labelledby="preguntas-title" className="scroll-mt-6">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 sm:px-8 lg:grid-cols-12 lg:gap-8">
        <h2 id="preguntas-title" className={`${sectionTitle} lg:col-span-5`}>
          Preguntas frecuentes
        </h2>
        <dl className="grid gap-9 lg:col-span-6 lg:col-start-7">
          {items.map((item) => (
            <div key={item.q} className="grid gap-2">
              <dt className="text-balance text-[clamp(1.25rem,2.2vw,1.6rem)] font-bold leading-tight tracking-[-0.02em]">{item.q}</dt>
              <dd className="max-w-[44ch] text-lg leading-relaxed text-cream-dim">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/**
 * Cierre de la página con los canales de contacto configurados. Si no hay ninguno, no se
 * muestra (no se ocupa espacio con un "muy pronto"). La mostaza queda solo en lo accionable.
 */
export function ContactBand({ menu }: { menu: PublicMenu }) {
  const { settings } = menu;
  const instagram = settings.instagramHandle;
  const hasContact = settings.whatsappNumber || instagram || settings.contactEmail || settings.addressText;
  if (!hasContact) return null;
  return (
    <section aria-labelledby="contacto-title" className="mt-28 bg-room-3 lg:mt-40">
      <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-4 py-16 sm:px-8 lg:grid-cols-12 lg:py-24">
        <div className="lg:col-span-7">
          <h2 id="contacto-title" className={sectionTitle}>
            ¿Te quedó alguna duda?
          </h2>
          <p className="mt-5 max-w-[38ch] text-lg leading-relaxed text-cream-dim">Escríbenos y te respondemos. Ten a mano tu código si ya hiciste un pedido.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {settings.whatsappNumber ? (
              <a href={whatsappLink(settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className="btn btn-mustard h-14 px-7 text-lg">
                Escribir por WhatsApp
              </a>
            ) : null}
            {instagram ? (
              <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer" className="rounded-full px-4 py-3 font-semibold underline decoration-ember-line underline-offset-4 hover:decoration-cream">
                @{instagram} en Instagram
              </a>
            ) : null}
            {settings.contactEmail ? (
              <a href={`mailto:${settings.contactEmail}`} className="rounded-full px-4 py-3 font-semibold underline decoration-ember-line underline-offset-4 hover:decoration-cream">
                {settings.contactEmail}
              </a>
            ) : null}
          </div>
          {settings.addressText ? <p className="mt-6 max-w-[44ch] text-cream-dim">{settings.addressText}</p> : null}
        </div>
        <div className="lg:col-span-4 lg:col-start-9">
          {/* eslint-disable-next-line @next/next/no-img-element -- logo vectorial oficial */}
          <img src="/brand/fulgor-logo-mostaza.svg" alt={settings.businessName} width={911} height={897} loading="lazy" className="mx-auto h-auto w-[min(60vw,300px)]" />
        </div>
      </div>
    </section>
  );
}
