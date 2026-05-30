import {
  pgTable,
  text,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const productsTable = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  unit: text("unit").notNull(),
  pricePerUnit: numeric("price_per_unit", { precision: 12, scale: 2 })
    .notNull(),
  platformPrice: numeric("platform_price", { precision: 12, scale: 2 }),
  minOrderQty: integer("min_order_qty").notNull(),
  stockQty: integer("stock_qty").notNull(),
  imageUrl: text("image_url"),
  manufacturerId: text("manufacturer_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ProductRow = typeof productsTable.$inferSelect;
export type InsertProduct = typeof productsTable.$inferInsert;
