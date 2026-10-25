import type { Metadata } from "next";
import { connection } from "next/server";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { formatPhone, whatsappLink } from "@/lib/phone";
import { getDb } from "@/server/db/client";
import { getSettings, toPublicSettings } from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escríbele a Fulgor Burger por WhatsApp o redes.",
};

const linkClass = "underline decoration-ember underline-offset-4 hover:text-mustard hover:decoration-mustard";

export default async function ContactPage() {
  await connection();
  const settings = toPublicSettings(await getSettings(getDb()));
  const rows: { label: string; value: React.ReactNode }[] = [];
  if (settings.whatsappNumber) {
    rows.push({
      label: "WhatsApp",
      value: (
        <a href={whatsappLink(settings.whatsappNumber)} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {formatPhone(settings.whatsappNumber)}
        </a>
      ),
    });
  }
  if (settings.instagramHandle) {
    rows.push({
      label: "Instagram",
      value: (
        <a href={`https://instagram.com/${settings.instagramHandle}`} target="_blank" rel="noopener noreferrer" className={linkClass}>
          @{settings.instagramHandle}
        </a>
      ),
    });
  }
  if (settings.contactEmail) {
    rows.push({
      label: "Correo",
      value: (
        <a href={`mailto:${settings.contactEmail}`} className={linkClass}>
          {settings.contactEmail}
        </a>
      ),
    });
  }
  if (settings.addressText) rows.push({ label: "Dirección", value: settings.addressText });
  if (settings.serviceArea) rows.push({ label: "Zona de entrega", value: settings.serviceArea });

  return (
    <>
      <SiteHeader businessName={settings.businessName} logoUrl={settings.logoUrl} />
      <main id="contenido" className="mx-auto max-w-[1320px] px-4 pb-10 pt-10 sm:px-8 lg:pt-20">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h1 className="text-balance text-[clamp(2.4rem,7vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.04em]">Contacto</h1>
            <p className="mt-5 max-w-[34ch] text-lg text-cream-dim">Si ya hiciste un pedido, ten a mano tu código: empieza por FB-.</p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            {rows.length ? (
              <dl className="grid gap-8">
                {rows.map((row) => (
                  <div key={row.label} className="grid gap-1">
                    <dt className="text-cream-dim">{row.label}</dt>
                    <dd className="break-words text-[clamp(1.4rem,3vw,2rem)] font-bold tracking-[-0.02em]">{row.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="rounded-[1.5rem] bg-room-2 p-6 text-lg text-cream-dim">Muy pronto publicaremos nuestros canales de contacto.</p>
            )}
          </div>
        </div>
      </main>
      <SiteFooter businessName={settings.businessName} tagline={settings.tagline} />
    </>
  );
}
