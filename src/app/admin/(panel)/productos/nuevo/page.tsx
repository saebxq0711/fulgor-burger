import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageTitle, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/server/auth/current";
import { ProductForm } from "../product-forms";

export const metadata = { title: "Nuevo producto" };

export default async function NewProductPage() {
  await requireAdmin("catalog:write");
  return (
    <>
      <Link href="/admin/productos" className="inline-flex w-fit items-center gap-1.5 rounded-lg py-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" />
        Productos
      </Link>
      <PageTitle title="Nuevo producto" />
      <Panel>
        <div className="p-5">
          <ProductForm />
        </div>
      </Panel>
    </>
  );
}
