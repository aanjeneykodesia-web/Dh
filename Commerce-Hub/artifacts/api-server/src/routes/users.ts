import { Router, type IRouter } from "express";
import {
  ListUsersQueryParams,
  ListUsersResponse,
  UpdateUserRoleParams,
  UpdateUserRoleBody,
  UpdateUserRoleResponse,
  ListTransportersResponse,
  UpdatePaymentCredentialsBody,
  UpdatePaymentCredentialsResponse,
} from "@workspace/api-zod";
import { db, usersTable, type UserRow } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { serializeUser } from "../lib/serializers";

const router: IRouter = Router();

router.get("/users", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  const params = ListUsersQueryParams.parse(req.query);
  const rows = await db
    .select()
    .from(usersTable)
    .where(params.role ? eq(usersTable.role, params.role as UserRow["role"]) : undefined)
    .orderBy(desc(usersTable.createdAt));
  const data = ListUsersResponse.parse(rows.map(serializeUser));
  res.json(data);
});

router.post("/users/:userId/role", async (req, res) => {
  if (!req.isAuthenticated() || req.user.role !== "admin") {
    res.status(403).json({ error: "Admin only" });
    return;
  }
  const { userId } = UpdateUserRoleParams.parse(req.params);
  const body = UpdateUserRoleBody.parse(req.body);
  await db
    .update(usersTable)
    .set({ role: body.role })
    .where(eq(usersTable.id, userId));
  const [u] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);
  if (!u) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const data = UpdateUserRoleResponse.parse(serializeUser(u));
  res.json(data);
});

router.get("/users/transporters", async (_req, res) => {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.role, "transporter"))
    .orderBy(usersTable.companyName);
  const data = ListTransportersResponse.parse(rows.map(serializeUser));
  res.json(data);
});

router.patch("/users/me/payment", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const body = UpdatePaymentCredentialsBody.parse(req.body);
  await db
    .update(usersTable)
    .set({
      upiId: body.upiId ?? null,
      bankAccount: body.bankAccount ?? null,
      bankIfsc: body.bankIfsc ?? null,
      bankName: body.bankName ?? null,
    })
    .where(eq(usersTable.id, req.user.id));
  const [updated] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user.id))
    .limit(1);
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const data = UpdatePaymentCredentialsResponse.parse(serializeUser(updated));
  res.json(data);
});

export default router;
