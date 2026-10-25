import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/server/auth/current";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Entrar al panel",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");
  return (
    <main className="theme-room grid min-h-dvh place-items-center px-4 py-10">
      <div className="grid w-full max-w-sm gap-8">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo oficial */}
        <img src="/brand/fulgor-logo-mostaza.svg" alt="Fulgor Burger" width={911} height={897} className="mx-auto h-auto w-40" />
        <div className="grid gap-2 text-center">
          <h1 className="text-3xl font-extrabold tracking-[-0.03em]">Panel de pedidos</h1>
          <p className="text-cream-dim">Solo para el equipo de Fulgor Burger.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
