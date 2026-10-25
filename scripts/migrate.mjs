// Aplica las migraciones versionadas de ./drizzle sobre DATABASE_URL.
// Uso: pnpm db:migrate   (en producción también: node scripts/migrate.mjs)
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  max: 1,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined,
});

try {
  await migrate(drizzle(pool), { migrationsFolder: new URL("../drizzle", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
  console.log("Migraciones aplicadas.");
} catch (error) {
  console.error("No se pudieron aplicar las migraciones:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
