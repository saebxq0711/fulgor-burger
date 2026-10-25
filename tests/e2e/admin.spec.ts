import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const admin = () => JSON.parse(readFileSync("test-results/.e2e-admin.json", "utf8")) as { email: string; password: string };

async function login(page: Page) {
  const { email, password } = admin();
  await page.goto("/admin/login");
  await page.getByLabel("Correo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/admin");
}

test.describe("permisos", () => {
  test("sin sesión no se entra al panel ni se exportan pedidos", async ({ page, request }) => {
    for (const path of ["/admin", "/admin/pedidos", "/admin/fechas", "/admin/productos", "/admin/marca"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login$/);
    }
    const csv = await request.get("/admin/pedidos/exportar", { maxRedirects: 0 });
    expect([307, 401]).toContain(csv.status());
    const fakeCookie = await request.get("/admin/pedidos/exportar", { headers: { cookie: "__Host-fulgor_admin=inventado-por-un-atacante-0000000000" }, maxRedirects: 0 });
    expect(fakeCookie.status()).toBe(401);
    const publicOrders = await request.get("/api/orders");
    expect(publicOrders.status()).toBe(404);
  });

  test("una cookie inventada no abre el panel", async ({ page, context }) => {
    await context.setExtraHTTPHeaders({ cookie: "__Host-fulgor_admin=token-inventado-1234567890abcdef" });
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("contraseña incorrecta muestra un error genérico", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Correo").fill(admin().email);
    await page.getByLabel("Contraseña").fill("no-es-la-clave-correcta");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Correo o contraseña incorrectos.")).toBeVisible();
  });
});

test.describe("panel administrativo", () => {
  test("ve pedidos, cancela uno y el cupo se libera en la página pública", async ({ page }) => {
    // Pedido de un cliente.
    await page.goto("/#agendar");
    await page.getByLabel("Nombre").fill("Cliente Para Cancelar");
    await page.getByLabel("WhatsApp").fill("3157778899");
    await page.getByRole("button", { name: "Revisar pedido" }).click();
    await page.getByRole("button", { name: /Confirmar pedido/ }).click();
    const code = (await page.getByText(/^FB-[A-Z0-9]{7}$/).innerText()).trim();
    await page.goto("/");
    const remainingText = async () => (await page.getByText(/Quedan \d+ de \d+/).first().innerText()).replace(/\s+/g, " ");
    const before = Number(/Quedan (\d+)/.exec(await remainingText())![1]);

    await login(page);
    await page.goto(`/admin/pedidos?q=${code}`);
    await page.locator(`a:visible`, { hasText: /Cliente Para Cancelar|FB-/ }).first().click();
    await expect(page.getByRole("heading", { name: code })).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Cancelar pedido" }).click();
    await expect(page.getByText("Estado actualizado.")).toBeVisible();
    await expect(page.getByText("Cancelado").first()).toBeVisible();

    await page.goto("/");
    expect(Number(/Quedan (\d+)/.exec(await remainingText())![1])).toBe(before + 1);

    // Exportación CSV con sesión.
    const csv = await page.request.get("/admin/pedidos/exportar");
    expect(csv.status()).toBe(200);
    expect(await csv.text()).toContain(code);
  });

  test("ajusta la capacidad de una fecha y publica una fecha especial", async ({ page }, testInfo) => {
    await login(page);
    await page.goto("/admin/fechas");
    const firstSlot = page.locator("section[aria-labelledby='proximas'] > section").first();
    await firstSlot.getByText("Editar horario, cierre o cupo").click();
    const capacity = testInfo.project.name === "movil" ? "25" : "26";
    await firstSlot.getByLabel("Cupo (hamburguesas)").fill(capacity);
    await firstSlot.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(firstSlot.getByText("Guardado.")).toBeVisible();
    await page.goto("/");
    await expect(page.getByText(new RegExp(`Quedan \\d+ de ${capacity}`)).first()).toBeVisible();

    await page.goto("/admin/fechas");
    const special = page.locator("section", { has: page.getByRole("heading", { name: "Publicar una fecha especial" }) });
    const target = new Date(Date.now() + 10 * 24 * 3600 * 1000);
    const close = new Date(target.getTime() - 24 * 3600 * 1000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    await special.getByLabel("Día de entrega").fill(iso(target));
    await special.getByLabel("Cierre de pedidos: día").fill(iso(close));
    await special.getByLabel("Cupo (hamburguesas)").fill("12");
    await special.getByLabel("Nombre especial (opcional)").fill(`Especial ${testInfo.project.name}`);
    await special.getByRole("button", { name: "Publicar fecha" }).click();
    await expect(special.getByText("Fecha publicada.")).toBeVisible();

    await page.goto("/#agendar");
    await expect(page.getByRole("radio", { name: new RegExp(`Especial ${testInfo.project.name}`) })).toBeEnabled();
  });

  test("crea un producto y aparece en la página pública", async ({ page }, testInfo) => {
    const name = `Fulgor Doble ${testInfo.project.name}`;
    await login(page);
    await page.goto("/admin/productos/nuevo");
    await page.getByLabel("Nombre").fill(name);
    await page.getByLabel("Precio (COP)").fill("36000");
    await page.getByLabel("Descripción", { exact: true }).fill("Doble carne y doble queso.");
    await page.getByRole("button", { name: "Crear producto" }).click();
    await page.waitForURL(/\/admin\/productos\/[0-9a-f-]{36}\?creado=1/);
    await page.goto("/#agendar");
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText("$ 36.000").first()).toBeVisible();
  });
});
