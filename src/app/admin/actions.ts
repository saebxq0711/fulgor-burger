"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { adminUsers, type OrderStatus, type SlotStatus } from "@/server/db/schema";
import { isDomainError } from "@/server/errors";
import { anonymize } from "@/server/secrets";
import { authorizeAction, clearSessionCookie, readSessionToken, setSessionCookie } from "@/server/auth/current";
import { hashPassword, passwordProblem, verifyPassword } from "@/server/auth/password";
import { authenticate, createSession, deleteSession, deleteUserSessions, type Permission, type SessionUser } from "@/server/auth/sessions";
import { changeOrderStatus, updateOrderNotes } from "@/server/services/orders";
import { saveImage } from "@/server/services/media";
import { createProduct, moveProduct, setProductActive, updateProduct } from "@/server/services/products";
import { currentRateCount, hitRateLimit } from "@/server/services/rate-limit";
import { setLogo, updateSettings } from "@/server/services/settings-admin";
import { ensureUpcomingSlots } from "@/server/services/schedule";
import {
  createRule,
  createSpecialSlot,
  deleteSlot,
  openSlotNow,
  setSlotCapacity,
  setSlotStatus,
  updateRule,
  updateSlot,
} from "@/server/services/slots";

export type ActionResult = {
  ok: boolean;
  message?: string;
  fields?: Record<string, string>;
  /** Marca de tiempo para que el formulario sepa que hubo una respuesta nueva. */
  at?: number;
};

const text = (form: FormData, key: string) => String(form.get(key) ?? "");
const checked = (form: FormData, key: string) => form.get(key) === "on" || form.get(key) === "true";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id = (form: FormData, key = "id") => {
  const value = text(form, key);
  if (!UUID.test(value)) throw new Error("Identificador inválido.");
  return value;
};

/** Autoriza, ejecuta y traduce errores de negocio a mensajes para el formulario. */
async function guarded(
  permission: Permission,
  run: (user: SessionUser) => Promise<ActionResult | void>,
  revalidate: string[] = [],
): Promise<ActionResult> {
  try {
    const user = await authorizeAction(permission);
    const result = await run(user);
    for (const path of revalidate) revalidatePath(path, "layout");
    return { ok: true, message: "Guardado.", ...result, at: Date.now() };
  } catch (error) {
    if (isDomainError(error)) {
      return { ok: false, message: error.message, fields: error.details.fields as Record<string, string> | undefined, at: Date.now() };
    }
    console.error("[admin] acción fallida", error);
    return { ok: false, message: "No se pudo completar. Inténtalo de nuevo.", at: Date.now() };
  }
}

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------

export async function loginAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const email = text(form, "email").trim().slice(0, 254);
  const password = text(form, "password").slice(0, 200);
  if (!email || !password) return { ok: false, message: "Escribe tu correo y tu contraseña.", at: Date.now() };

  const db = getDb();
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() || requestHeaders.get("x-real-ip") || "unknown";
  // Solo cuentan los intentos fallidos: 8 por correo y 20 por IP cada 15 minutos.
  const ipKey = `login:ip:${anonymize(ip)}`;
  const emailKey = `login:email:${anonymize(email.toLowerCase())}`;
  const window = 15 * 60;
  if ((await currentRateCount(db, ipKey, window)) >= 20 || (await currentRateCount(db, emailKey, window)) >= 8) {
    return { ok: false, message: "Demasiados intentos fallidos. Espera 15 minutos e inténtalo de nuevo.", at: Date.now() };
  }

  const user = await authenticate(db, email, password);
  if (!user) {
    await hitRateLimit(db, ipKey, 20, window);
    await hitRateLimit(db, emailKey, 8, window);
    return { ok: false, message: "Correo o contraseña incorrectos.", at: Date.now() };
  }

  const session = await createSession(db, user.id);
  await setSessionCookie(session.token, session.expiresAt);
  redirect("/admin");
}

export async function logoutAction() {
  const token = await readSessionToken();
  if (token) await deleteSession(getDb(), token);
  await clearSessionCookie();
  redirect("/admin/login");
}

export async function changePasswordAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guarded("orders:read", async (user): Promise<ActionResult> => {
    const current = text(form, "current");
    const next = text(form, "next");
    const confirm = text(form, "confirm");
    const db = getDb();
    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, user.id));
    if (!row || !(await verifyPassword(current, row.passwordHash))) {
      return { ok: false, message: "La contraseña actual no es correcta.", fields: { current: "No coincide." } };
    }
    const problem = passwordProblem(next);
    if (problem) return { ok: false, message: problem, fields: { next: problem } };
    if (next !== confirm) return { ok: false, message: "Las contraseñas nuevas no coinciden.", fields: { confirm: "No coincide." } };
    await db.update(adminUsers).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(adminUsers.id, user.id));
    // Cierra las demás sesiones y abre una nueva para este dispositivo.
    await deleteUserSessions(db, user.id);
    const session = await createSession(db, user.id);
    await setSessionCookie(session.token, session.expiresAt);
    return { ok: true, message: "Contraseña actualizada. Cerramos tus otras sesiones." };
  });
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "fulfilled", "cancelled"];

export async function changeOrderStatusAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guarded(
    "orders:write",
    async (user) => {
      const to = text(form, "to") as OrderStatus;
      if (!ORDER_STATUSES.includes(to)) return { ok: false, message: "Estado inválido." };
      const { changed } = await changeOrderStatus(getDb(), { orderId: id(form), to, actorId: user.id, note: text(form, "note") });
      return { ok: true, message: changed ? "Estado actualizado." : "El pedido ya tenía ese estado." };
    },
    ["/admin"],
  );
}

export async function saveOrderNotesAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guarded("orders:write", async () => updateOrderNotes(getDb(), id(form), text(form, "notes")), ["/admin"]);
}

// ---------------------------------------------------------------------------
// Fechas y reglas
// ---------------------------------------------------------------------------

function slotInput(form: FormData) {
  return {
    deliveryDate: text(form, "deliveryDate"),
    label: text(form, "label"),
    startTime: text(form, "startTime"),
    endTime: text(form, "endTime"),
    closeDate: text(form, "closeDate"),
    closeTime: text(form, "closeTime"),
    capacity: text(form, "capacity"),
  };
}

export async function createSlotAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guarded(
    "schedule:write",
    async () => {
      await createSpecialSlot(getDb(), slotInput(form));
      return { ok: true, message: "Fecha publicada." };
    },
    ["/admin", "/"],
  );
}

export async function updateSlotAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guarded("schedule:write", async () => void (await updateSlot(getDb(), id(form), slotInput(form))), ["/admin", "/"]);
}

export async function setSlotCapacityAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guarded("schedule:write", async () => void (await setSlotCapacity(getDb(), id(form), Number(text(form, "capacity")))), ["/admin", "/"]);
}

const SLOT_STATUSES: SlotStatus[] = ["open", "paused", "closed"];

export async function setSlotStatusAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guarded(
    "schedule:write",
    async () => {
      const status = text(form, "status") as SlotStatus;
      if (!SLOT_STATUSES.includes(status)) return { ok: false, message: "Estado inválido." };
      await setSlotStatus(getDb(), id(form), status);
      return { ok: true, message: status === "open" ? "Fecha abierta." : status === "paused" ? "Fecha en pausa." : "Fecha cerrada." };
    },
    ["/admin", "/"],
  );
}

export async function openSlotNowAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guarded("schedule:write", async () => {
    await openSlotNow(getDb(), id(form));
    return { ok: true, message: "La fecha ya recibe pedidos." };
  }, ["/admin", "/"]);
}

export async function deleteSlotAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guarded("schedule:write", async () => {
    await deleteSlot(getDb(), id(form));
    return { ok: true, message: "Fecha borrada." };
  }, ["/admin", "/"]);
}

function ruleInput(form: FormData) {
  return {
    name: text(form, "name"),
    weekday: text(form, "weekday"),
    startTime: text(form, "startTime"),
    endTime: text(form, "endTime"),
    capacity: text(form, "capacity"),
    openDaysBefore: text(form, "openDaysBefore"),
    openTime: text(form, "openTime"),
    closeDaysBefore: text(form, "closeDaysBefore"),
    closeTime: text(form, "closeTime"),
    weeksAhead: text(form, "weeksAhead"),
    active: checked(form, "active"),
  };
}

export async function saveRuleAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guarded(
    "schedule:write",
    async () => {
      const db = getDb();
      const ruleId = text(form, "id");
      if (ruleId) await updateRule(db, id(form), ruleInput(form));
      else await createRule(db, ruleInput(form));
      const created = await ensureUpcomingSlots(db);
      return { ok: true, message: created ? `Regla guardada. Se publicaron ${created} fecha(s) nuevas.` : "Regla guardada." };
    },
    ["/admin", "/"],
  );
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------

function productInput(form: FormData) {
  return {
    name: text(form, "name"),
    description: text(form, "description"),
    priceCop: text(form, "priceCop").replace(/[.\s$]/g, ""),
    imageAlt: text(form, "imageAlt"),
    maxPerOrder: text(form, "maxPerOrder"),
    active: checked(form, "active"),
  };
}

async function uploadedImage(form: FormData) {
  const file = form.get("image");
  if (file instanceof File && file.size > 0) return saveImage(getDb(), file);
  return undefined;
}

export async function createProductAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  let createdId: string | null = null;
  const result = await guarded(
    "catalog:write",
    async () => {
      const imageId = (await uploadedImage(form)) ?? null;
      createdId = (await createProduct(getDb(), productInput(form), imageId)).id;
    },
    ["/admin", "/"],
  );
  if (result.ok && createdId) redirect(`/admin/productos/${createdId}?creado=1`);
  return result;
}

export async function updateProductAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guarded(
    "catalog:write",
    async () => {
      const imageId = checked(form, "removeImage") ? null : await uploadedImage(form);
      await updateProduct(getDb(), id(form), productInput(form), imageId);
    },
    ["/admin", "/"],
  );
}

export async function toggleProductAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guarded("catalog:write", async () => void (await setProductActive(getDb(), id(form), checked(form, "active"))), ["/admin", "/"]);
}

export async function moveProductAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guarded("catalog:write", async () => {
    await moveProduct(getDb(), id(form), text(form, "direction") === "up" ? "up" : "down");
    return { ok: true, message: "Orden actualizado." };
  }, ["/admin", "/"]);
}

// ---------------------------------------------------------------------------
// Marca, textos y reglas del negocio
// ---------------------------------------------------------------------------

export async function saveSettingsAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guarded(
    "settings:write",
    async () => {
      await updateSettings(getDb(), {
        businessName: text(form, "businessName"),
        tagline: text(form, "tagline"),
        whatsappNumber: text(form, "whatsappNumber"),
        contactEmail: text(form, "contactEmail"),
        instagramHandle: text(form, "instagramHandle"),
        addressText: text(form, "addressText"),
        serviceArea: text(form, "serviceArea"),
        paymentNote: text(form, "paymentNote"),
        privacyText: text(form, "privacyText"),
        initialOrderStatus: text(form, "initialOrderStatus") === "confirmed" ? "confirmed" : "pending",
        maxUnitsPerOrder: text(form, "maxUnitsPerOrder"),
        requireAddress: checked(form, "requireAddress"),
        ordersPaused: checked(form, "ordersPaused"),
        pausedMessage: text(form, "pausedMessage"),
      });
    },
    ["/admin", "/"],
  );
}

export async function saveLogoAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  return guarded(
    "settings:write",
    async () => {
      if (checked(form, "reset")) {
        await setLogo(getDb(), null);
        return { ok: true, message: "Se volvió al logo oficial." };
      }
      const file = form.get("logo");
      if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Elige una imagen para el logo.", fields: { logo: "Elige un archivo." } };
      await setLogo(getDb(), await saveImage(getDb(), file, 800));
      return { ok: true, message: "Logo actualizado." };
    },
    ["/admin", "/"],
  );
}
