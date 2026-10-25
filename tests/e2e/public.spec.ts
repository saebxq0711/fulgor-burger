import { expect, test, type Page } from "@playwright/test";

async function remainingInHero(page: Page) {
  const text = await page.locator("#hero-title ~ div").getByText(/Quedan \d+ de \d+/).first().innerText();
  return Number(/Quedan\s+(\d+)/.exec(text.replace(/\s+/g, " "))![1]);
}

async function placeOrder(page: Page, name: string, phone: string, extra = 0) {
  await page.goto("/#agendar");
  await page.getByLabel("Nombre").fill(name);
  await page.getByLabel("WhatsApp").fill(phone);
  for (let i = 0; i < extra; i++) await page.getByRole("button", { name: "Agregar una Fulgor Clásica" }).click();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByRole("heading", { name: "Revisa tu pedido" })).toBeVisible();
  await page.getByRole("button", { name: /Confirmar pedido/ }).click();
  await expect(page.getByText("Código de pedido", { exact: true })).toBeVisible();
  return (await page.getByText(/^FB-[A-Z0-9]{7}$/).innerText()).trim();
}

test.describe("página pública", () => {
  test("la hamburguesa es protagonista y la página no se desborda", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "Fulgor Clásica" })).toBeVisible();
    await expect(page.getByText("$ 28.000").first()).toBeVisible();
    await expect(page.getByText(/Quedan \d+ de \d+/).first()).toBeVisible();
    const cta = page.getByRole("link", { name: "Agendar la mía" });
    await expect(cta).toBeVisible();
    // El botón principal está en la primera pantalla, también en el teléfono.
    const box = await cta.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    for (const path of ["/privacidad", "/contacto"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    }
  });

  test("valida nombre y WhatsApp antes del resumen", async ({ page }) => {
    await page.goto("/#agendar");
    await page.getByRole("button", { name: "Revisar pedido" }).click();
    await expect(page.getByText(/Escribe tu nombre/)).toBeVisible();
    await page.getByLabel("Nombre").fill("Ana María");
    await page.getByLabel("WhatsApp").fill("123");
    await page.getByRole("button", { name: "Revisar pedido" }).click();
    await expect(page.getByText(/Revisa el número/)).toBeVisible();
    await expect(page.getByLabel("WhatsApp")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("heading", { name: "Revisa tu pedido" })).toHaveCount(0);
  });

  test("agendar descuenta el cupo compartido y otro cliente lo ve actualizado", async ({ page, browser }) => {
    const other = await browser.newPage();
    await other.goto("/");
    await page.goto("/");
    const before = await remainingInHero(page);

    const code = await placeOrder(page, "Laura Gómez", "3001112233", 1);
    expect(code).toMatch(/^FB-/);

    // El otro navegador se actualiza solo (sondeo corto), sin recargar.
    await expect.poll(async () => remainingInHero(other), { timeout: 25_000, intervals: [1000] }).toBe(before - 2);

    await page.reload();
    expect(await remainingInHero(page)).toBe(before - 2);
    await other.close();
  });

  test("un pedido con enlace de WhatsApp del negocio, sin datos personales", async ({ page }) => {
    await placeOrder(page, "Mateo Ruiz", "3204445566");
    const link = page.getByRole("link", { name: "Escribirnos por WhatsApp" });
    const href = await link.getAttribute("href");
    expect(href).toContain("https://wa.me/573001234567");
    expect(decodeURIComponent(href!)).not.toContain("3204445566");
    expect(decodeURIComponent(href!)).not.toContain("Mateo");
    // Otra persona en el mismo dispositivo puede hacer un pedido nuevo.
    await page.getByRole("button", { name: "Hacer otro pedido" }).click();
    await expect(page.getByLabel("Nombre")).toHaveValue("");
  });
});
