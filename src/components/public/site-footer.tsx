import Link from "next/link";

export function SiteFooter({ businessName, tagline }: { businessName: string; tagline: string }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mx-auto max-w-[1320px] px-4 pb-8 pt-24 sm:px-8 sm:pb-10">
      <div className="grid gap-3 text-sm text-cream-dim sm:grid-cols-[1fr_auto_1fr] sm:items-baseline">
        <p>{tagline || `${businessName}, hamburguesas por tanda`}</p>
        <nav aria-label="Pie de página" className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/#agendar" className="text-cream hover:text-mustard">
            Agendar
          </Link>
          <Link href="/contacto" className="text-cream hover:text-mustard">
            Contacto
          </Link>
          <Link href="/privacidad" className="text-cream hover:text-mustard">
            Privacidad
          </Link>
        </nav>
        <p className="sm:text-right">
          © {year} {businessName}
        </p>
      </div>
    </footer>
  );
}
