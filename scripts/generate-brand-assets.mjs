// Genera los íconos y la imagen social a partir de los logos de public/brand.
// Uso: node scripts/generate-brand-assets.mjs
// Se ejecuta solo cuando cambian los logos; los archivos generados se versionan.
import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const COFFEE = "#3B2218";
const MUSTARD = "#F5B82E";

const brand = (file) => readFile(new URL(`../public/brand/${file}`, import.meta.url));

async function iconOnGround(size, padding, ground, iconFile) {
  const inner = Math.round(size * (1 - padding * 2));
  const icon = await sharp(await brand(iconFile), { density: 600 })
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: ground } })
    .composite([{ input: icon, gravity: "center" }])
    .png()
    .toBuffer();
}

async function main() {
  // Favicon SVG: icono café sobre mostaza (versión "icono positivo" del logo).
  const iconPositive = await readFile(new URL("../public/brand/originales/fulgor-icono-positivo.svg", import.meta.url), "utf8");
  await writeFile(new URL("../src/app/icon.svg", import.meta.url), iconPositive);

  await writeFile(new URL("../src/app/apple-icon.png", import.meta.url), await iconOnGround(180, 0.12, MUSTARD, "fulgor-icono-cafe.svg"));
  await writeFile(new URL("../public/brand/icon-192.png", import.meta.url), await iconOnGround(192, 0.12, MUSTARD, "fulgor-icono-cafe.svg"));
  await writeFile(new URL("../public/brand/icon-512.png", import.meta.url), await iconOnGround(512, 0.12, MUSTARD, "fulgor-icono-cafe.svg"));

  // Imagen social 1200x630: logo completo mostaza sobre la sala café.
  const logo = await sharp(await brand("fulgor-logo-mostaza.svg"), { density: 300 })
    .resize(470, 470, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const og = await sharp({ create: { width: 1200, height: 630, channels: 4, background: COFFEE } })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toBuffer();
  await writeFile(new URL("../src/app/opengraph-image.png", import.meta.url), og);
  await writeFile(new URL("../src/app/twitter-image.png", import.meta.url), og);

  console.log("Íconos e imagen social generados.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
