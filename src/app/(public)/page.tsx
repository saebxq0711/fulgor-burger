import { connection } from "next/server";
import { Hero } from "@/components/public/hero";
import { ContactBand, Faq, HowItWorks } from "@/components/public/info-sections";
import { LiveMenuProvider } from "@/components/public/live-menu";
import { OrderFlow } from "@/components/public/order-flow";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { getDb } from "@/server/db/client";
import { getPublicMenu } from "@/server/services/public-menu";

export default async function HomePage() {
  await connection(); // cupos en vivo: nunca se prerenderiza
  const menu = await getPublicMenu(getDb());

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: menu.settings.businessName,
    servesCuisine: "Hamburguesas",
    currenciesAccepted: "COP",
    ...(menu.settings.whatsappNumber ? { telephone: menu.settings.whatsappNumber } : {}),
    ...(menu.products.length
      ? {
          hasMenu: {
            "@type": "Menu",
            hasMenuItem: menu.products.map((item) => ({
              "@type": "MenuItem",
              name: item.name,
              description: item.description,
              offers: { "@type": "Offer", price: item.priceCop, priceCurrency: "COP" },
            })),
          },
        }
      : {}),
  };

  return (
    <LiveMenuProvider initial={menu}>
      <SiteHeader businessName={menu.settings.businessName} logoUrl={menu.settings.logoUrl} ctaHref="#agendar" />
      <main id="contenido">
        <Hero />
        <OrderFlow />
        <div className="mt-28 grid gap-28 lg:mt-40 lg:gap-40">
          <HowItWorks menu={menu} />
          <Faq menu={menu} />
        </div>
        <ContactBand menu={menu} />
      </main>
      <SiteFooter businessName={menu.settings.businessName} tagline={menu.settings.tagline} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </LiveMenuProvider>
  );
}
