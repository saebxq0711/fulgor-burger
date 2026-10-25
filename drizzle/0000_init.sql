CREATE TYPE "public"."admin_role" AS ENUM('admin', 'staff');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."slot_status" AS ENUM('open', 'paused', 'closed');--> statement-breakpoint
CREATE TABLE "admin_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"name" varchar(80) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'admin' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(60) NOT NULL,
	"weekday" smallint NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"capacity" integer NOT NULL,
	"open_days_before" smallint NOT NULL,
	"open_time" varchar(5) NOT NULL,
	"close_days_before" smallint NOT NULL,
	"close_time" varchar(5) NOT NULL,
	"weeks_ahead" smallint DEFAULT 1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_rules_weekday_range" CHECK ("delivery_rules"."weekday" BETWEEN 0 AND 6),
	CONSTRAINT "delivery_rules_capacity_positive" CHECK ("delivery_rules"."capacity" > 0),
	CONSTRAINT "delivery_rules_weeks_ahead_range" CHECK ("delivery_rules"."weeks_ahead" BETWEEN 1 AND 8),
	CONSTRAINT "delivery_rules_open_before_close" CHECK ("delivery_rules"."open_days_before" >= "delivery_rules"."close_days_before")
);
--> statement-breakpoint
CREATE TABLE "delivery_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid,
	"delivery_date" date NOT NULL,
	"label" varchar(60),
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"opens_at" timestamp with time zone,
	"closes_at" timestamp with time zone NOT NULL,
	"capacity" integer NOT NULL,
	"status" "slot_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_slots_capacity_non_negative" CHECK ("delivery_slots"."capacity" >= 0),
	CONSTRAINT "delivery_slots_window_valid" CHECK ("delivery_slots"."ends_at" > "delivery_slots"."starts_at"),
	CONSTRAINT "delivery_slots_close_before_end" CHECK ("delivery_slots"."closes_at" <= "delivery_slots"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mime_type" varchar(40) NOT NULL,
	"bytes" "bytea" NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"actor_id" uuid,
	"note" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" varchar(80) NOT NULL,
	"unit_price_cop" integer NOT NULL,
	"quantity" smallint NOT NULL,
	"line_total_cop" integer NOT NULL,
	CONSTRAINT "order_items_quantity_positive" CHECK ("order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(12) NOT NULL,
	"slot_id" uuid NOT NULL,
	"customer_name" varchar(60) NOT NULL,
	"customer_phone" varchar(20) NOT NULL,
	"delivery_address" varchar(200),
	"status" "order_status" NOT NULL,
	"total_units" integer NOT NULL,
	"total_cop" integer NOT NULL,
	"idempotency_key" uuid NOT NULL,
	"request_hash" varchar(64) NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_units_positive" CHECK ("orders"."total_units" > 0),
	CONSTRAINT "orders_total_non_negative" CHECK ("orders"."total_cop" >= 0)
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(80) NOT NULL,
	"name" varchar(80) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_cop" integer NOT NULL,
	"image_id" uuid,
	"image_alt" varchar(160) DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"max_per_order" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_price_positive" CHECK ("products"."price_cop" > 0),
	CONSTRAINT "products_max_per_order_positive" CHECK ("products"."max_per_order" IS NULL OR "products"."max_per_order" > 0)
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" varchar(128) PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"business_name" varchar(60) DEFAULT 'Fulgor Burger' NOT NULL,
	"tagline" varchar(120) DEFAULT '' NOT NULL,
	"logo_id" uuid,
	"whatsapp_number" varchar(20),
	"contact_email" varchar(254),
	"instagram_handle" varchar(40),
	"address_text" varchar(200),
	"service_area" varchar(200),
	"payment_note" varchar(240) NOT NULL,
	"privacy_text" text NOT NULL,
	"initial_order_status" "order_status" DEFAULT 'pending' NOT NULL,
	"max_units_per_order" smallint DEFAULT 6 NOT NULL,
	"require_address" boolean DEFAULT false NOT NULL,
	"orders_paused" boolean DEFAULT false NOT NULL,
	"paused_message" varchar(200),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_singleton" CHECK ("settings"."id" = 1),
	CONSTRAINT "settings_initial_status" CHECK ("settings"."initial_order_status" IN ('pending', 'confirmed')),
	CONSTRAINT "settings_max_units_range" CHECK ("settings"."max_units_per_order" BETWEEN 1 AND 50)
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_user_id_admin_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."admin_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_slots" ADD CONSTRAINT "delivery_slots_rule_id_delivery_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."delivery_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_actor_id_admin_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_slot_id_delivery_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."delivery_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "admin_sessions_token_hash_key" ON "admin_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "admin_sessions_user_idx" ON "admin_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_slots_rule_date_key" ON "delivery_slots" USING btree ("rule_id","delivery_date");--> statement-breakpoint
CREATE INDEX "delivery_slots_public_idx" ON "delivery_slots" USING btree ("status","closes_at");--> statement-breakpoint
CREATE INDEX "delivery_slots_starts_idx" ON "delivery_slots" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "order_events_order_idx" ON "order_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_code_key" ON "orders" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_idempotency_key" ON "orders" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "orders_slot_status_idx" ON "orders" USING btree ("slot_id","status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_phone_idx" ON "orders" USING btree ("customer_phone");--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_key" ON "products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "products_active_sort_idx" ON "products" USING btree ("active","sort_order");