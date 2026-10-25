import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;
/** Transacción o conexión: las funciones de servicio aceptan ambas. */
export type DbExecutor = Pick<Database, "select" | "insert" | "update" | "delete" | "execute" | "query">;

const globalForDb = globalThis as unknown as { fulgorPool?: Pool; fulgorDb?: Database };

/**
 * TLS hacia PostgreSQL. Con DATABASE_SSL=true se verifica el certificado del servidor; para
 * proveedores con CA propia (Supabase, RDS) se fija esa CA con DATABASE_CA_CERT (PEM; los
 * saltos de línea pueden ir escritos como "\n"). Desactivar la verificación
 * (DATABASE_SSL_REJECT_UNAUTHORIZED=false) es solo un último recurso.
 */
export function databaseSsl() {
  if (process.env.DATABASE_SSL !== "true") return undefined;
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
  return {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
    ...(ca ? { ca } : {}),
  };
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Falta la variable de entorno DATABASE_URL.");
  }
  return new Pool({
    connectionString,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    // En serverless cada instancia tiene su propio pool: se liberan conexiones ociosas pronto
    // para no agotar el pooler de la base.
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    ssl: databaseSsl(),
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
