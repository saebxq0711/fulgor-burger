import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fulgor Burger",
    short_name: "Fulgor",
    description: "Agenda tu hamburguesa por tanda.",
    start_url: "/",
    display: "standalone",
    background_color: "#1c0f09",
    theme_color: "#1c0f09",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
