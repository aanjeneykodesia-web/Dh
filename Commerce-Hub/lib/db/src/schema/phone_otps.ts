import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const phoneOtpsTable = pgTable("phone_otps", {
  id: text("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PhoneOtpRow = typeof phoneOtpsTable.$inferSelect;
export type InsertPhoneOtp = typeof phoneOtpsTable.$inferInsert;
