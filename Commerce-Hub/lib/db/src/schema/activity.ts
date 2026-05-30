import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const activityTypeEnum = pgEnum("activity_type", [
  "order_placed",
  "order_accepted",
  "order_rejected",
  "shipment_assigned",
  "shipment_picked_up",
  "shipment_in_transit",
  "shipment_delivered",
  "product_created",
  "user_joined",
]);

export const activityTable = pgTable("activity_events", {
  id: text("id").primaryKey(),
  type: activityTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  // Audience: include this user's id and we surface to them. We store the
  // primary owner (e.g., shopkeeper for an order_placed event) and use a
  // second column for the counterpart so admins / both sides can see it.
  ownerId: text("owner_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  counterpartId: text("counterpart_id").references(() => usersTable.id, {
    onDelete: "cascade",
  }),
  relatedId: text("related_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ActivityRow = typeof activityTable.$inferSelect;
export type InsertActivity = typeof activityTable.$inferInsert;
