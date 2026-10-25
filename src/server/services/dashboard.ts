import "server-only";
import { and, asc, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { DbExecutor } from "../db/client";
import { deliverySlots, orders } from "../db/schema";
import { activeOrderCountSql, reservedRevenueSql, reservedUnitsSql, slotState } from "./availability";

export async function getDashboard(db: DbExecutor, now = new Date()) {
  const upcoming = await db
    .select({ slot: deliverySlots, reserved: reservedUnitsSql, revenue: reservedRevenueSql, orderCount: activeOrderCountSql })
    .from(deliverySlots)
    .where(gte(deliverySlots.endsAt, now))
    .orderBy(asc(deliverySlots.startsAt))
    .limit(6);

  const recent = await db
    .select({ order: orders, slot: deliverySlots })
    .from(orders)
    .innerJoin(deliverySlots, eq(orders.slotId, deliverySlots.id))
    .orderBy(desc(orders.createdAt))
    .limit(8);

  const [{ value: pendingCount }] = await db
    .select({ value: count() })
    .from(orders)
    .innerJoin(deliverySlots, eq(orders.slotId, deliverySlots.id))
    .where(and(eq(orders.status, "pending"), gte(deliverySlots.endsAt, now)));

  const [totals] = await db
    .select({
      orders: sql<number>`COUNT(*)::int`,
      units: sql<number>`COALESCE(SUM(${orders.totalUnits}), 0)::int`,
      revenue: sql<number>`COALESCE(SUM(${orders.totalCop}), 0)::int`,
    })
    .from(orders)
    .where(inArray(orders.status, ["pending", "confirmed", "fulfilled"]));

  return {
    upcoming: upcoming.map((row) => ({ ...row, state: slotState(row.slot, row.reserved, now) })),
    recent,
    pendingCount,
    totals,
  };
}
