import Link from "next/link";
import { Plus } from "lucide-react";
import { PageTitle, Panel, linkButtonPrimary } from "@/components/admin/ui";
import { formatCop } from "@/lib/money";
import { requireAdmin } from "@/server/auth/current";
import { getDb } from "@/server/db/client";
import { listProducts } from "@/server/services/products";
import { ProductRowActions } from "./product-forms";

export const metadata = { title: "Productos" };

export default async function ProductsPage() {
  await requireAdmin("catalog:write");
  const products = await listProducts(getDb());
  return (
    <>
      <PageTitle
        title="Productos"
        description="El primero de la lista es el protagonista de la página pública."
        actions={
          <Link href="/admin/productos/nuevo" className={linkButtonPrimary}>
            <Plus aria-hidden className="size-4" />
            Nuevo producto
          </Link>
        }
      />
      <Panel>
        {products.length ? (
          <ul className="divide-y divide-line">
            {products.map((product, index) => (
              <li key={product.id} className="flex flex-wrap items-center gap-4 px-4 py-3 sm:px-5">
                <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-room">
                  {/* eslint-disable-next-line @next/next/no-img-element -- miniatura */}
                  <img
                    src={product.imageId ? `/media/${product.imageId}` : "/brand/fulgor-icono-mostaza.svg"}
                    alt=""
                    className={product.imageId ? "size-full object-cover" : "size-10"}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/productos/${product.id}`} className="font-semibold text-ink hover:underline">
                    {product.name}
                  </Link>
                  <p className="text-[13px] text-ink-soft tabular">
                    {formatCop(product.priceCop)} · {product.active ? "Visible" : "Oculto"}
                    {product.imageId ? "" : " · Sin foto real"}
                  </p>
                </div>
                <ProductRowActions id={product.id} name={product.name} active={product.active} isFirst={index === 0} isLast={index === products.length - 1} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid gap-3 p-6">
            <p className="font-semibold">Aún no hay productos.</p>
            <p className="text-sm text-ink-soft">Sin productos activos la página pública no permite agendar.</p>
          </div>
        )}
      </Panel>
    </>
  );
}
