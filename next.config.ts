import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // Casi todo en esta app es dinámico (cupos, sesión, pedidos): se usa el modelo de
  // renderizado clásico con lecturas dinámicas explícitas en lugar de Cache Components.
  cacheComponents: false,
  partialPrefetching: false,
  poweredByHeader: false,
  images: {
    localPatterns: [{ pathname: "/media/**" }, { pathname: "/brand/**" }],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: {
      // Las fotos se suben por acciones de servidor (límite de la app: 6 MB).
      bodySizeLimit: "7mb",
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
