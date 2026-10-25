import { TZDate } from "@date-fns/tz";

/** Zona horaria de operación del restaurante. */
export const BUSINESS_TZ = "America/Bogota";
export const LOCALE = "es-CO";

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: string): boolean {
  return HHMM.test(value);
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

/** Instante real para una fecha local de Bogotá (YYYY-MM-DD) y una hora HH:MM. */
export function zonedInstant(dateString: string, time: string): Date {
  if (!isValidDateString(dateString)) throw new Error(`Fecha inválida: ${dateString}`);
  const match = HHMM.exec(time);
  if (!match) throw new Error(`Hora inválida: ${time}`);
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(new TZDate(y, m - 1, d, Number(match[1]), Number(match[2]), 0, BUSINESS_TZ).getTime());
}

/** Fecha local de Bogotá (YYYY-MM-DD) del instante dado. */
export function businessDateString(instant: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
  return parts; // en-CA produce YYYY-MM-DD
}

/** Hora local de Bogotá (HH:MM, 24 h) del instante dado. */
export function businessTimeString(instant: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BUSINESS_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(instant);
}

/** Día de la semana (0 = domingo) de una fecha YYYY-MM-DD. */
export function weekdayOf(dateString: string): number {
  const [y, m, d] = dateString.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Suma días calendario a una fecha YYYY-MM-DD. */
export function addDays(dateString: string, days: number): string {
  const [y, m, d] = dateString.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

export const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;

const dayFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: BUSINESS_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const shortDayFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: BUSINESS_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
});
const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: BUSINESS_TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: BUSINESS_TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dayTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  timeZone: BUSINESS_TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "sábado, 31 de octubre, 8:00 p. m." */
export function formatDayTime(instant: Date): string {
  return dayTimeFormatter.format(instant);
}

/** "domingo, 1 de noviembre" */
export function formatDay(instant: Date): string {
  return dayFormatter.format(instant);
}

/** "dom, 1 nov" */
export function formatShortDay(instant: Date): string {
  return shortDayFormatter.format(instant);
}

/** "12:00 p. m." */
export function formatTime(instant: Date): string {
  return timeFormatter.format(instant);
}

/** "25 oct 2026, 3:41 p. m." */
export function formatDateTime(instant: Date): string {
  return dateTimeFormatter.format(instant);
}

/** "12:00 p. m. – 6:00 p. m." */
export function formatWindow(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase(LOCALE) + value.slice(1);
}
