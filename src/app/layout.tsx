import type { Metadata, Viewport } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Fulgor Burger · Agenda tu hamburguesa",
    template: "%s · Fulgor Burger",
  },
  description:
    "Hamburguesas por tanda con cupos limitados. Elige el día de entrega, deja tu nombre y WhatsApp y agenda tu pedido en un minuto, sin registrarte.",
  applicationName: "Fulgor Burger",
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Fulgor Burger",
    title: "Fulgor Burger · Agenda tu hamburguesa",
    description: "Hamburguesas por tanda con cupos limitados. Agenda la tuya para el próximo día de entrega.",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1c0f09",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO" className={rubik.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
