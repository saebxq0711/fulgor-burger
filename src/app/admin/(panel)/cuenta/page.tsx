import { PageTitle, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/server/auth/current";
import { PasswordForm } from "./password-form";

export const metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const user = await requireAdmin();
  return (
    <>
      <PageTitle title="Mi cuenta" description={`${user.name} · ${user.email}`} />
      <Panel title="Cambiar contraseña" description="Al cambiarla se cierran tus sesiones en otros dispositivos.">
        <div className="p-5">
          <PasswordForm />
        </div>
      </Panel>
      <p className="text-[13px] text-ink-soft">
        ¿Olvidaste la contraseña? Quien administre el servidor puede restablecerla con <code className="rounded bg-tint px-1">pnpm admin:create -- --reset</code>.
      </p>
    </>
  );
}
