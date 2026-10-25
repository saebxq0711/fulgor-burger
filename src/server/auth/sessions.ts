import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import type { DbExecutor } from "../db/client";
import { adminSessions, adminUsers, type AdminRole } from "../db/schema";
import { sha256Hex } from "../secrets";
import { DUMMY_HASH, verifyPassword } from "./password";

export const SESSION_TTL_SECONDS = 7 * 24 * 3600;

export type SessionUser = { id: string; email: string; name: string; role: AdminRole };

/** Permisos por rol. "staff" está preparado para un empleado con acceso limitado. */
const PERMISSIONS = {
  admin: ["orders:read", "orders:write", "catalog:write", "schedule:write", "settings:write", "users:write"],
  staff: ["orders:read", "orders:write"],
} as const satisfies Record<AdminRole, readonly string[]>;

export type Permission = (typeof PERMISSIONS)["admin"][number];

export function can(user: Pick<SessionUser, "role">, permission: Permission): boolean {
  return (PERMISSIONS[user.role] as readonly string[]).includes(permission);
}

export async function authenticate(db: DbExecutor, email: string, password: string): Promise<SessionUser | null> {
  const [user] = await db
    .select()
    .from(adminUsers)
    .where(sql`lower(${adminUsers.email}) = lower(${email.trim()})`);
  if (!user || !user.active) {
    await verifyPassword(password, DUMMY_HASH); // mismo costo de tiempo: no revela si el correo existe
    return null;
  }
  if (!(await verifyPassword(password, user.passwordHash))) return null;
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, user.id));
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** Crea una sesión y devuelve el token en claro (solo va a la cookie). */
export async function createSession(db: DbExecutor, userId: string, now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  await db.insert(adminSessions).values({ tokenHash: sha256Hex(token), userId, expiresAt });
  // Limpieza oportunista de sesiones vencidas.
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, now));
  return { token, expiresAt };
}

export async function userForSessionToken(db: DbExecutor, token: string | undefined, now = new Date()): Promise<SessionUser | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  const [row] = await db
    .select({ id: adminUsers.id, email: adminUsers.email, name: adminUsers.name, role: adminUsers.role })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
    .where(and(eq(adminSessions.tokenHash, sha256Hex(token)), gt(adminSessions.expiresAt, now), eq(adminUsers.active, true)));
  return row ?? null;
}

export async function deleteSession(db: DbExecutor, token: string) {
  await db.delete(adminSessions).where(eq(adminSessions.tokenHash, sha256Hex(token)));
}

export async function deleteUserSessions(db: DbExecutor, userId: string) {
  await db.delete(adminSessions).where(eq(adminSessions.userId, userId));
}
