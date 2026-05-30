import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "shopkeeper",
  "manufacturer",
  "transporter",
  "admin",
]);

export const idProofTypeEnum = pgEnum("id_proof_type", [
  "aadhaar",
  "pan",
  "passport",
  "drivers_license",
  "voter_id",
]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: roleEnum("role").notNull(),
  companyName: text("company_name").notNull(),
  description: text("description").notNull().default(""),
  phone: text("phone"),
  phoneNumber: text("phone_number").unique(),
  idProofType: idProofTypeEnum("id_proof_type"),
  idProofNumber: text("id_proof_number"),
  gstin: text("gstin"),
  city: text("city"),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),
  upiId: text("upi_id"),
  bankAccount: text("bank_account"),
  bankIfsc: text("bank_ifsc"),
  bankName: text("bank_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserRow = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
