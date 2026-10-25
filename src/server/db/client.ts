import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;
/** Transacción o conexión: las funciones de servicio aceptan ambas. */
export type DbExecutor = Pick<Database, "select" | "insert" | "update" | "delete" | "execute" | "query">;

const globalForDb = globalThis as unknown as { fulgorPool?: Pool; fulgorDb?: Database };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta la variable de entorno DATABASE_URL.");
  }
  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" } : undefined,
  });
}

/** Conexión perezosa: no falla al importar el módulo, solo al usarla sin DATABASE_URL. */
export function getDb(): Database {
  if (!globalForDb.fulgorDb) {
    globalForDb.fulgorPool = createPool();
    globalForDb.fulgorDb = drizzle(globalForDb.fulgorPool, { schema });
  }
  return globalForDb.fulgorDb;
}

export async function closeDb() {
  await globalForDb.fulgorPool?.end();
  globalForDb.fulgorPool = undefined;
  globalForDb.fulgorDb = undefined;
}
