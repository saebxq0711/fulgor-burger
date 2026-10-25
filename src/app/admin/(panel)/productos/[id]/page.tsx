import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PageTitle, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/server/auth/current";
import { getDb } from "@/server/db/client";
import { getProduct } from "@/server/services/products";
import { ProductForm } from "../product-forms";

export const metadata = { title: "Editar producto" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ creado?: string }> }) {
  await requireAdmin("catalog:write");
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const product = await getProduct(getDb(), id);
  if (!product) notFound();
  const { creado } = await searchParams;
  return (
    <>
      <Link href="/admin/productos" className="inline-flex w-fit items-center gap-1.5 rounded-lg py-1 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" />
        Productos
      </Link>
      <PageTitle title={product.name} description={creado ? "Producto creado. Ya puedes ajustarlo aquí." : "Los cambios de precio no alteran pedidos ya hechos."} />
      <Panel>
        <div className="p-5">
          <ProductForm
            values={{
              id: product.id,
              name: product.name,
              description: product.description,
              priceCop: product.priceCop,
              imageAlt: product.imageAlt,
              maxPerOrder: product.maxPerOrder,
              active: product.active,
              imageUrl: product.imageId ? `/media/${product.imageId}` : null,
            }}
          />
        </div>
      </Panel>
    </>
  );
}
