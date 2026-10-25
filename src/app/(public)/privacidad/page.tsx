import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { whatsappLink } from "@/lib/phone";
import { getDb } from "@/server/db/client";
import { getSettings, toPublicSettings } from "@/server/services/settings";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: "Qué datos pedimos al agendar un pedido en Fulgor Burger y para qué los usamos.",
};

export default async function PrivacyPage() {
  await connection();
  const settings = toPublicSettings(await getSettings(getDb()));
  return (
    <>
      <SiteHeader businessName={settings.businessName} logoUrl={settings.logoUrl} />
      <main id="contenido" className="mx-auto max-w-[1320px] px-4 pb-10 pt-10 sm:px-8 lg:pt-20">
        <div className="grid gap-10 lg:grid-cols-12">
          <h1 className="text-balance text-[clamp(2.4rem,7vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-0.04em] lg:col-span-5">Aviso de privacidad</h1>
          <div className="grid gap-8 text-lg leading-relaxed lg:col-span-6 lg:col-start-7">
            <div className="whitespace-pre-line">{settings.privacyText}</div>
            <div className="grid gap-3 rounded-[1.5rem] bg-room-2 p-6 text-cream-dim">
              <p className="font-semibold text-cream">Qué pedimos al agendar</p>
              <p>
                Tu nombre, tu número de WhatsApp{settings.requireAddress ? ", la dirección de entrega" : ""} y lo que pediste. No pedimos correo, contraseña ni datos de
                tarjetas.
              </p>
              <p>No necesitas cuenta. Solo el equipo de {settings.businessName} puede ver tus datos.</p>
            </div>
            <p className="text-cream-dim">
              Para consultar, corregir o borrar tus datos,{" "}
              {settings.whatsappNumber ? (
                <a
                  href={whatsappLink(settings.whatsappNumber, "Hola, quiero consultar mis datos de pedido.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cream underline underline-offset-4 hover:text-mustard"
                >
                  escríbenos por WhatsApp
                </a>
              ) : settings.contactEmail ? (
                <a href={`mailto:${settings.contactEmail}`} className="text-cream underline underline-offset-4 hover:text-mustard">
                  escríbenos a {settings.contactEmail}
                </a>
              ) : (
                <Link href="/contacto" className="text-cream underline underline-offset-4 hover:text-mustard">
                  contáctanos
                </Link>
              )}
              .
            </p>
          </div>
        </div>
      </main>
      <SiteFooter businessName={settings.businessName} tagline={settings.tagline} />
    </>
  );
}
