import { eq, sql } from "drizzle-orm";
import type { DbExecutor } from "../../src/server/db/client";
import { adminUsers } from "../../src/server/db/schema";
import { hashPassword, passwordProblem } from "../../src/server/auth/password";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createAdminUser(db: DbExecutor, input: { email: string; password: string; name: string }) {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) throw new Error("Correo inválido.");
  const problem = passwordProblem(input.password);
  if (problem) throw new Error(problem);
  const [user] = await db
    .insert(adminUsers)
    .values({ email, name: input.name.slice(0, 80), passwordHash: await hashPassword(input.password), role: "admin" })
    .returning({ id: adminUsers.id, email: adminUsers.email });
  return user;
}

export async function resetAdminPassword(db: DbExecutor, emailInput: string, password: string) {
  const problem = passwordProblem(password);
  if (problem) throw new Error(problem);
  const [user] = await db
    .update(adminUsers)
    .set({ passwordHash: await hashPassword(password), active: true, updatedAt: new Date() })
    .where(sql`lower(${adminUsers.email}) = lower(${emailInput.trim()})`)
    .returning({ id: adminUsers.id });
  return user ?? null;
}

export async function adminExists(db: DbExecutor, email: string) {
  const [row] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email.trim().toLowerCase()));
  return Boolean(row);
}
