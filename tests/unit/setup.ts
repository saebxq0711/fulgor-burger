import { existsSync } from "node:fs";
import { config } from "dotenv";
import { afterAll } from "vitest";

// Las pruebas siempre usan la base de pruebas, nunca la de desarrollo.
if (existsSync(".env.test")) config({ path: ".env.test", override: true, quiet: true });
process.env.DATABASE_URL ??= "postgres://fulgor:fulgor_local_dev@localhost:5433/fulgor_test";
process.env.APP_SECRET ??= "secreto-solo-para-pruebas-automatizadas-0123456789";
process.env.CRON_SECRET ??= "cron-secreto-de-pruebas-0123456789";

if (!process.env.DATABASE_URL.includes("fulgor_test")) {
  throw new Error("Las pruebas deben apuntar a la base fulgor_test (revisa .env.test).");
}

afterAll(async () => {
  const { closeDb } = await import("@/server/db/client");
  await closeDb();
});
