import { pgTable, text, timestamp, pgEnum, doublePrecision } from "drizzle-orm/pg-core";
import { ordersTable } from "./orders";
import { usersTable } from "./users";

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "assigned",
  "picked_up",
  "in_transit",
  "delivered",
]);

export const shipmentsTable = pgTable("shipments", {
  id: text("id").primaryKey(),
  trackingNumber: text("tracking_number").notNull().unique(),
  status: shipmentStatusEnum("status").notNull().default("assigned"),
  orderId: text("order_id")
    .notNull()
    .unique()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  transporterId: text("transporter_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "restrict" }),
  originAddress: text("origin_address").notNull(),
  destinationAddress: text("destination_address").notNull(),
  pickupDate: timestamp("pickup_date", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  notes: text("notes"),
  originLat: doublePrecision("origin_lat"),
  originLng: doublePrecision("origin_lng"),
  destLat: doublePrecision("dest_lat"),
  destLng: doublePrecision("dest_lng"),
  currentLat: doublePrecision("current_lat"),
  currentLng: doublePrecision("current_lng"),
  lastLocationAt: timestamp("last_location_at", { withTimezone: true }),
  pickupPin: text("pickup_pin"),
  deliveryPin: text("delivery_pin"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ShipmentRow = typeof shipmentsTable.$inferSelect;
export type InsertShipment = typeof shipmentsTable.$inferInsert;
