import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "../db/client";
import { DomainError } from "../errors";
import { can, SESSION_TTL_SECONDS, userForSessionToken, type Permission, type SessionUser } from "./sessions";

/** En producción el prefijo __Host- obliga a Secure, Path=/ y sin Domain. */
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-fulgor_admin" : "fulgor_admin";

export async function setSessionCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function readSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Usuario de la sesión actual, validado contra la base (una vez por solicitud). */
export const getCurrentAdmin = cache(async (): Promise<SessionUser | null> => {
  return userForSessionToken(getDb(), await readSessionToken());
});

/** Para páginas: redirige al inicio de sesión si no hay sesión válida. */
export async function requireAdmin(permission?: Permission): Promise<SessionUser> {
  const user = await getCurrentAdmin();
  if (!user) redirect("/admin/login");
  if (permission && !can(user, permission)) redirect("/admin?sin-permiso=1");
  return user;
}

/** Para acciones de servidor: lanza un error en vez de redirigir. */
export async function authorizeAction(permission: Permission): Promise<SessionUser> {
  const user = await getCurrentAdmin();
  if (!user) throw new DomainError("FORBIDDEN", "Tu sesión expiró. Vuelve a iniciar sesión.");
  if (!can(user, permission)) throw new DomainError("FORBIDDEN", "No tienes permiso para esta acción.");
  return user;
}
