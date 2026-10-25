import { parsePhoneNumberFromString } from "libphonenumber-js/min";

export type PhoneResult = { ok: true; e164: string; display: string } | { ok: false };

/**
 * Normaliza un número de WhatsApp. Por defecto asume Colombia (+57); acepta otros países
 * si el número viene con su prefijo internacional (+…).
 */
export function normalizePhone(raw: string): PhoneResult {
  const cleaned = raw.trim();
  if (cleaned.length < 7 || cleaned.length > 24) return { ok: false };
  if (!/^[+\d\s().-]+$/.test(cleaned)) return { ok: false };
  const parsed = parsePhoneNumberFromString(cleaned, "CO");
  if (!parsed || !parsed.isValid()) return { ok: false };
  // En Colombia, WhatsApp vive en celulares (10 dígitos que empiezan por 3).
  if (parsed.country === "CO" && !/^3\d{9}$/.test(parsed.nationalNumber)) return { ok: false };
  return { ok: true, e164: parsed.number, display: formatPhone(parsed.number) };
}

/** Enlace wa.me para el número del negocio, con un texto prellenado no sensible. */
export function whatsappLink(e164: string, text?: string): string {
  const digits = e164.replace(/\D/g, "");
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`;
}

/** Formato legible para un número ya normalizado: celulares de Colombia como "300 123 4567". */
export function formatPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return e164;
  const national = String(parsed.nationalNumber);
  if (parsed.country === "CO" && /^3\d{9}$/.test(national)) {
    return `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`;
  }
  return parsed.formatInternational();
}
