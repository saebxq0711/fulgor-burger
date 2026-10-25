import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import pg from "pg";
import { hashPassword } from "../../src/server/auth/password";

export const E2E_ADMIN_FILE = "test-results/.e2e-admin.json";

/**
 * Deja la base de pruebas en un estado conocido: un producto, una fecha abierta con 20 cupos
 * y un administrador con contraseña aleatoria (solo existe durante la prueba).
 */
export default async function globalSetup() {
  const client = new pg.Client({ connectionString: process.env.E2E_DATABASE_URL ?? "postgres://fulgor:fulgor_local_dev@localhost:5433/fulgor_test" });
  await client.connect();
  try {
    await client.query(`TRUNCATE order_events, order_items, orders, delivery_slots, delivery_rules, products,
      admin_sessions, admin_users, rate_limits, media RESTART IDENTITY CASCADE`);
    await client.query(`INSERT INTO settings (id, payment_note, privacy_text, whatsapp_number)
      VALUES (1, 'Coordinamos el pago contigo por WhatsApp antes de la entrega.',
        'Usamos tu nombre y tu número de WhatsApp solo para preparar tu pedido y escribirte sobre él. No los compartimos con nadie.',
        '+573001234567')
      ON CONFLICT (id) DO NOTHING`);
    await client.query(`INSERT INTO products (slug, name, description, price_cop, image_alt, active, sort_order)
      VALUES ('fulgor-clasica', 'Fulgor Clásica', 'Carne a la parrilla, cheddar fundido y salsa de la casa.', 28000, 'Hamburguesa Fulgor Clásica', true, 0)`);
    const now = Date.now();
    const day = 24 * 3600 * 1000;
    const starts = new Date(now + 4 * day);
    await client.query(
      `INSERT INTO delivery_slots (delivery_date, starts_at, ends_at, closes_at, opens_at, capacity, status)
       VALUES ($1, $2, $3, $4, NULL, 20, 'open')`,
      [starts.toISOString().slice(0, 10), starts, new Date(starts.getTime() + 6 * 3600 * 1000), new Date(now + 3 * day)],
    );
    const email = "e2e-admin@fulgor.test";
    const password = randomBytes(18).toString("base64url");
    await client.query(`INSERT INTO admin_users (email, name, password_hash, role) VALUES ($1, 'Admin E2E', $2, 'admin')`, [email, await hashPassword(password)]);
    mkdirSync("test-results", { recursive: true });
    writeFileSync(E2E_ADMIN_FILE, JSON.stringify({ email, password }));
  } finally {
    await client.end();
  }
}
