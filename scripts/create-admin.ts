// Crea el primer administrador (o restablece su contraseña) sin dejar credenciales en el código.
//
// Uso:
//   ADMIN_EMAIL=tu@correo.com ADMIN_PASSWORD='una-clave-larga' pnpm admin:create
//   pnpm admin:create -- --reset        (cambia la contraseña de un administrador existente)
//
// Si no hay variables, pregunta los datos en la terminal (la contraseña no se guarda en el historial).
import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { closeDb, getDb } from "../src/server/db/client";
import { deleteUserSessions } from "../src/server/auth/sessions";
import { adminExists, createAdminUser, resetAdminPassword } from "./lib/admin";

async function ask(question: string) {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function main() {
  const reset = process.argv.includes("--reset");
  const email = process.env.ADMIN_EMAIL?.trim() || (await ask("Correo del administrador: "));
  const password = process.env.ADMIN_PASSWORD || (await ask("Contraseña (mínimo 12 caracteres): "));
  const db = getDb();

  if (reset) {
    const user = await resetAdminPassword(db, email, password);
    if (!user) throw new Error(`No existe un administrador con el correo ${email}.`);
    await deleteUserSessions(db, user.id);
    console.log(`Contraseña de ${email} actualizada. Se cerraron sus sesiones abiertas.`);
    return;
  }

  if (await adminExists(db, email)) {
    throw new Error(`Ya existe un administrador con el correo ${email}. Usa --reset para cambiar su contraseña.`);
  }
  const name = process.env.ADMIN_NAME?.trim() || (await ask("Nombre (opcional): ")) || "Administrador";
  await createAdminUser(db, { email, password, name });
  console.log(`Administrador ${email} creado. Entra en /admin/login.`);
  if (process.env.ADMIN_PASSWORD) console.log("Recuerda quitar ADMIN_PASSWORD del entorno.");
}

main()
  .catch((error) => {
    console.error("No se pudo crear el administrador:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(closeDb);
