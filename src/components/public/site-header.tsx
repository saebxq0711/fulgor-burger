import Link from "next/link";

type SiteHeaderProps = {
  businessName: string;
  logoUrl: string | null;
  /** En páginas secundarias el botón lleva a la portada. */
  ctaHref?: string;
};

export function SiteHeader({ businessName, logoUrl, ctaHref = "/#agendar" }: SiteHeaderProps) {
  return (
    <header className="relative z-20">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-mustard focus:px-4 focus:py-2 focus:font-semibold focus:text-coffee"
      >
        Saltar al contenido
      </a>
      <div className="mx-auto flex h-[4.25rem] max-w-[1320px] items-center justify-between gap-6 px-4 sm:px-8">
        <Link href="/" className="-m-2 flex items-center rounded-lg p-2" aria-label={`${businessName}, inicio`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG de marca o logo subido, tamaño fijo */}
          <img
            src={logoUrl ?? "/brand/fulgor-wordmark-mostaza.svg"}
            alt=""
            width={logoUrl ? undefined : 124}
            height={40}
            className="h-9 w-auto sm:h-10"
          />
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
          <Link href="/#como-funciona" className="hidden rounded-full px-3 py-2 text-base text-cream-dim transition-colors hover:text-cream md:inline-block">
            Cómo funciona
          </Link>
          <Link href="/#preguntas" className="hidden rounded-full px-3 py-2 text-base text-cream-dim transition-colors hover:text-cream md:inline-block">
            Preguntas
          </Link>
          <Link href="/contacto" className="hidden rounded-full px-3 py-2 text-base text-cream-dim transition-colors hover:text-cream md:inline-block">
            Contacto
          </Link>
          <Link
            href={ctaHref}
            className="ml-1 inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-mustard underline decoration-mustard/40 decoration-2 underline-offset-[0.3em] transition-colors hover:decoration-mustard"
          >
            Agendar
          </Link>
        </nav>
      </div>
    </header>
  );
}
