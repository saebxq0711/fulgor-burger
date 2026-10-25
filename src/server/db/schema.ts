import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// Administración
// ---------------------------------------------------------------------------

/** Roles disponibles. Hoy solo se crea "admin"; "staff" queda listo para permisos limitados. */
export const adminRole = pgEnum("admin_role", ["admin", "staff"]);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 254 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: adminRole("role").notNull().default("admin"),
    active: boolean("active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("admin_users_email_key").on(sql`lower(${t.email})`)],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** SHA-256 del token; el token en claro solo vive en la cookie del navegador. */
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("admin_sessions_token_hash_key").on(t.tokenHash), index("admin_sessions_user_idx").on(t.userId)],
);

// ---------------------------------------------------------------------------
// Archivos (logo y fotos). Se guardan en la base para no depender de un disco local.
// ---------------------------------------------------------------------------

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  mimeType: varchar("mime_type", { length: 40 }).notNull(),
  bytes: bytea("bytes").notNull(),
  byteSize: integer("byte_size").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 80 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    description: text("description").notNull().default(""),
    /** Precio en pesos colombianos enteros (COP no usa centavos en la práctica). */
    priceCop: integer("price_cop").notNull(),
    imageId: uuid("image_id").references(() => media.id, { onDelete: "set null" }),
    imageAlt: varchar("image_alt", { length: 160 }).notNull().default(""),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    /** Límite de unidades de este producto por pedido; null = usa el límite general. */
    maxPerOrder: smallint("max_per_order"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("products_slug_key").on(t.slug),
    index("products_active_sort_idx").on(t.active, t.sortOrder),
    check("products_price_positive", sql`${t.priceCop} > 0`),
    check("products_max_per_order_positive", sql`${t.maxPerOrder} IS NULL OR ${t.maxPerOrder} > 0`),
  ],
);

// ---------------------------------------------------------------------------
// Calendario de entregas
// ---------------------------------------------------------------------------

/**
 * Regla de recurrencia semanal. Genera una fecha de entrega (slot) por semana.
 * Las horas son de America/Bogota en formato HH:MM.
 */
export const deliveryRules = pgTable(
  "delivery_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 60 }).notNull(),
    /** 0 = domingo … 6 = sábado. */
    weekday: smallint("weekday").notNull(),
    startTime: varchar("start_time", { length: 5 }).notNull(),
    endTime: varchar("end_time", { length: 5 }).notNull(),
    capacity: integer("capacity").notNull(),
    /** Días antes de la entrega en que se abre el cupo, y a qué hora. */
    openDaysBefore: smallint("open_days_before").notNull(),
    openTime: varchar("open_time", { length: 5 }).notNull(),
    /** Días antes de la entrega en que se cierra el cupo, y a qué hora. 0 = el mismo día. */
    closeDaysBefore: smallint("close_days_before").notNull(),
    closeTime: varchar("close_time", { length: 5 }).notNull(),
    /** Cuántas fechas futuras se mantienen publicadas a la vez. */
    weeksAhead: smallint("weeks_ahead").notNull().default(1),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("delivery_rules_weekday_range", sql`${t.weekday} BETWEEN 0 AND 6`),
    check("delivery_rules_capacity_positive", sql`${t.capacity} > 0`),
    check("delivery_rules_weeks_ahead_range", sql`${t.weeksAhead} BETWEEN 1 AND 8`),
    check("delivery_rules_open_before_close", sql`${t.openDaysBefore} >= ${t.closeDaysBefore}`),
  ],
);

export const slotStatus = pgEnum("slot_status", ["open", "paused", "closed"]);

export const deliverySlots = pgTable(
  "delivery_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ruleId: uuid("rule_id").references(() => deliveryRules.id, { onDelete: "set null" }),
    /** Fecha local de Bogotá (YYYY-MM-DD) de la entrega. */
    deliveryDate: date("delivery_date", { mode: "string" }).notNull(),
    /** Nombre opcional para fechas especiales. */
    label: varchar("label", { length: 60 }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    /** Desde cuándo acepta pedidos; null = desde que se publica. */
    opensAt: timestamp("opens_at", { withTimezone: true }),
    closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
    capacity: integer("capacity").notNull(),
    status: slotStatus("status").notNull().default("open"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Una regla genera como máximo una fecha por día: la generación es idempotente.
    uniqueIndex("delivery_slots_rule_date_key").on(t.ruleId, t.deliveryDate),
    index("delivery_slots_public_idx").on(t.status, t.closesAt),
    index("delivery_slots_starts_idx").on(t.startsAt),
    check("delivery_slots_capacity_non_negative", sql`${t.capacity} >= 0`),
    check("delivery_slots_window_valid", sql`${t.endsAt} > ${t.startsAt}`),
    check("delivery_slots_close_before_end", sql`${t.closesAt} <= ${t.endsAt}`),
  ],
);

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------

/**
 * pending = agendado (aún sin confirmar por el negocio), confirmed = confirmado,
 * fulfilled = entregado, cancelled = cancelado. Solo cancelled libera cupo.
 */
export const orderStatus = pgEnum("order_status", ["pending", "confirmed", "fulfilled", "cancelled"]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Código corto y aleatorio para hablar del pedido (no secuencial). */
    code: varchar("code", { length: 12 }).notNull(),
    slotId: uuid("slot_id")
      .notNull()
      .references(() => deliverySlots.id, { onDelete: "restrict" }),
    customerName: varchar("customer_name", { length: 60 }).notNull(),
    /** Teléfono en formato E.164, p. ej. +573001234567. */
    customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
    deliveryAddress: varchar("delivery_address", { length: 200 }),
    status: orderStatus("status").notNull(),
    /** Unidades totales del pedido (suma de los ítems), lo que consume cupo. */
    totalUnits: integer("total_units").notNull(),
    totalCop: integer("total_cop").notNull(),
    idempotencyKey: uuid("idempotency_key").notNull(),
    /** Huella del contenido de la solicitud, para detectar reutilización de la clave. */
    requestHash: varchar("request_hash", { length: 64 }).notNull(),
    adminNotes: text("admin_notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("orders_code_key").on(t.code),
    uniqueIndex("orders_idempotency_key").on(t.idempotencyKey),
    index("orders_slot_status_idx").on(t.slotId, t.status),
    index("orders_created_idx").on(t.createdAt),
    index("orders_phone_idx").on(t.customerPhone),
    check("orders_units_positive", sql`${t.totalUnits} > 0`),
    check("orders_total_non_negative", sql`${t.totalCop} >= 0`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    /** Copia del nombre y precio al momento del pedido: el historial no cambia si el producto cambia. */
    productName: varchar("product_name", { length: 80 }).notNull(),
    unitPriceCop: integer("unit_price_cop").notNull(),
    quantity: smallint("quantity").notNull(),
    lineTotalCop: integer("line_total_cop").notNull(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: orderStatus("from_status"),
    toStatus: orderStatus("to_status").notNull(),
    actorId: uuid("actor_id").references(() => adminUsers.id, { onDelete: "set null" }),
    note: varchar("note", { length: 200 }),
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

// ---------------------------------------------------------------------------
// Configuración del negocio (una sola fila, id = 1)
// ---------------------------------------------------------------------------

export const settings = pgTable(
  "settings",
  {
    id: smallint("id").primaryKey().default(1),
    businessName: varchar("business_name", { length: 60 }).notNull().default("Fulgor Burger"),
    tagline: varchar("tagline", { length: 120 }).notNull().default(""),
    /** Logo subido por el administrador; null = se usa el logo oficial de public/brand. */
    logoId: uuid("logo_id").references(() => media.id, { onDelete: "set null" }),
    /** WhatsApp oficial del negocio en E.164; null = no se muestran enlaces wa.me. */
    whatsappNumber: varchar("whatsapp_number", { length: 20 }),
    contactEmail: varchar("contact_email", { length: 254 }),
    instagramHandle: varchar("instagram_handle", { length: 40 }),
    addressText: varchar("address_text", { length: 200 }),
    serviceArea: varchar("service_area", { length: 200 }),
    paymentNote: varchar("payment_note", { length: 240 }).notNull(),
    privacyText: text("privacy_text").notNull(),
    /** Estado con el que nace un pedido público: "pending" (agendado) o "confirmed". */
    initialOrderStatus: orderStatus("initial_order_status").notNull().default("pending"),
    maxUnitsPerOrder: smallint("max_units_per_order").notNull().default(6),
    requireAddress: boolean("require_address").notNull().default(false),
    /** Interruptor general: pausa todos los pedidos públicos. */
    ordersPaused: boolean("orders_paused").notNull().default(false),
    pausedMessage: varchar("paused_message", { length: 200 }),
    updatedAt: updatedAt(),
  },
  (t) => [
    check("settings_singleton", sql`${t.id} = 1`),
    check("settings_initial_status", sql`${t.initialOrderStatus} IN ('pending', 'confirmed')`),
    check("settings_max_units_range", sql`${t.maxUnitsPerOrder} BETWEEN 1 AND 50`),
  ],
);

// ---------------------------------------------------------------------------
// Límite de frecuencia (anti-abuso). Claves con IP y teléfono hasheados.
// ---------------------------------------------------------------------------

export const rateLimits = pgTable("rate_limits", {
  key: varchar("key", { length: 128 }).primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

export type Product = typeof products.$inferSelect;
export type DeliverySlot = typeof deliverySlots.$inferSelect;
export type DeliveryRule = typeof deliveryRules.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type OrderStatus = (typeof orderStatus.enumValues)[number];
export type SlotStatus = (typeof slotStatus.enumValues)[number];
export type AdminRole = (typeof adminRole.enumValues)[number];
