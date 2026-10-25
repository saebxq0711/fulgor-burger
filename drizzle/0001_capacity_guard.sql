-- Defensa en profundidad contra la sobreventa.
-- La aplicación ya bloquea la fila de la fecha (SELECT … FOR UPDATE) antes de reservar,
-- pero estas reglas hacen que la propia base de datos rechace cualquier escritura que deje
-- una fecha con más unidades reservadas que su capacidad, venga de donde venga.

CREATE OR REPLACE FUNCTION fulgor_slot_reserved_units(p_slot_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(total_units), 0)::integer
  FROM orders
  WHERE slot_id = p_slot_id
    AND status IN ('pending', 'confirmed', 'fulfilled');
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION fulgor_orders_capacity_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_capacity integer;
  v_reserved integer;
BEGIN
  IF NEW.status = 'cancelled' THEN
    RETURN NULL;
  END IF;

  -- Serializa a todos los escritores de la misma fecha.
  SELECT capacity INTO v_capacity FROM delivery_slots WHERE id = NEW.slot_id FOR UPDATE;
  v_reserved := fulgor_slot_reserved_units(NEW.slot_id);

  IF v_reserved > v_capacity THEN
    RAISE EXCEPTION 'SLOT_CAPACITY_EXCEEDED'
      USING ERRCODE = 'P0001', DETAIL = format('slot=%s reserved=%s capacity=%s', NEW.slot_id, v_reserved, v_capacity);
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER orders_capacity_guard
AFTER INSERT OR UPDATE OF status, total_units, slot_id ON orders
FOR EACH ROW
EXECUTE FUNCTION fulgor_orders_capacity_guard();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION fulgor_slots_capacity_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.capacity < fulgor_slot_reserved_units(NEW.id) THEN
    RAISE EXCEPTION 'SLOT_CAPACITY_BELOW_RESERVED'
      USING ERRCODE = 'P0001', DETAIL = format('slot=%s capacity=%s', NEW.id, NEW.capacity);
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER delivery_slots_capacity_guard
BEFORE UPDATE OF capacity ON delivery_slots
FOR EACH ROW
EXECUTE FUNCTION fulgor_slots_capacity_guard();
--> statement-breakpoint

-- La configuración es una sola fila.
INSERT INTO settings (id, payment_note, privacy_text)
VALUES (
  1,
  'Coordinamos el pago contigo por WhatsApp antes de la entrega.',
  'Usamos tu nombre y tu número de WhatsApp solo para preparar tu pedido y escribirte sobre él. No los compartimos con nadie ni los usamos para publicidad. Si quieres que borremos tus datos, escríbenos por WhatsApp.'
)
ON CONFLICT (id) DO NOTHING;
