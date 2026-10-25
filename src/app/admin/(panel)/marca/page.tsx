import { PageTitle, Panel } from "@/components/admin/ui";
import { formatPhone } from "@/lib/phone";
import { requireAdmin } from "@/server/auth/current";
import { getDb } from "@/server/db/client";
import { getSettings } from "@/server/services/settings";
import { LogoForm, SettingsForm } from "./settings-forms";

export const metadata = { title: "Marca y textos" };

export default async function BrandPage() {
  await requireAdmin("settings:write");
  const settings = await getSettings(getDb());
  return (
    <>
      <PageTitle title="Marca y textos" description="Logo, contacto, textos públicos y reglas de los pedidos." />
      <Panel title="Logo de la cabecera" description="La paleta de la página sale del logo oficial: mostaza #F5B82E y café #3B2218.">
        <div className="p-5">
          <LogoForm logoUrl={settings.logoId ? `/media/${settings.logoId}` : null} />
        </div>
      </Panel>
      <Panel>
        <div className="p-5">
          <SettingsForm
            values={{
              businessName: settings.businessName,
              tagline: settings.tagline,
              whatsappNumber: settings.whatsappNumber ? formatPhone(settings.whatsappNumber) : "",
              contactEmail: settings.contactEmail ?? "",
              instagramHandle: settings.instagramHandle ?? "",
              addressText: settings.addressText ?? "",
              serviceArea: settings.serviceArea ?? "",
              paymentNote: settings.paymentNote,
              privacyText: settings.privacyText,
              initialOrderStatus: settings.initialOrderStatus === "confirmed" ? "confirmed" : "pending",
              maxUnitsPerOrder: settings.maxUnitsPerOrder,
              requireAddress: settings.requireAddress,
              ordersPaused: settings.ordersPaused,
              pausedMessage: settings.pausedMessage ?? "",
            }}
          />
        </div>
      </Panel>
    </>
  );
}
