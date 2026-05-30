import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import {
  GetMeResponse,
  CheckPhoneBody,
  CheckPhoneResponse,
  SignupWithPhoneBody,
  SignupWithPhoneResponse,
  LoginWithPhoneBody,
  LoginWithPhoneResponse,
} from "@workspace/api-zod";
import { db, usersTable, activityTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createSession, destroySession } from "../lib/session";
import { newId } from "../lib/ids";
import { serializeUser } from "../lib/serializers";

const router: IRouter = Router();

const BCRYPT_ROUNDS = 10;

function normalizePhone(input: string): string {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");
  return (hasPlus ? "+" : "") + digits;
}

// ── Me / Logout ───────────────────────────────────────────────────────────────

router.get("/auth/me", (req, res) => {
  if (!req.isAuthenticated() || !req.user) {
    res.json(GetMeResponse.parse({ authenticated: false, user: null }));
    return;
  }
  res.json(GetMeResponse.parse({ authenticated: true, user: serializeUser(req.user) }));
});

router.post("/auth/logout", async (req, res) => {
  await destroySession(req, res);
  res.json({ success: true });
});

// ── Check phone ───────────────────────────────────────────────────────────────

router.post("/auth/check-phone", async (req, res) => {
  const body = CheckPhoneBody.parse(req.body);
  const phoneNumber = normalizePhone(body.phoneNumber);
  if (phoneNumber.replace(/\D/g, "").length < 7) {
    res.status(400).json({ error: "Invalid phone number" });
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id, passwordHash: usersTable.passwordHash })
    .from(usersTable)
    .where(eq(usersTable.phoneNumber, phoneNumber))
    .limit(1);

  res.json(
    CheckPhoneResponse.parse({
      phoneNumber,
      signupRequired: !existing,
      hasPassword: !!(existing?.passwordHash),
    }),
  );
});

// ── Password login ────────────────────────────────────────────────────────────

router.post("/auth/login-phone", async (req, res) => {
  const body = LoginWithPhoneBody.parse(req.body);
  const phoneNumber = normalizePhone(body.phoneNumber);

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phoneNumber, phoneNumber))
    .limit(1);

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "No account found for this number." });
    return;
  }

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Incorrect password" });
    return;
  }

  await createSession(res, user.id);
  res.json(LoginWithPhoneResponse.parse(serializeUser(user)));
});

// ── Signup ────────────────────────────────────────────────────────────────────

router.post("/auth/signup", async (req, res) => {
  const body = SignupWithPhoneBody.parse(req.body);
  const phoneNumber = normalizePhone(body.phoneNumber);

  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.phoneNumber, phoneNumber))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "An account already exists for this phone number." });
    return;
  }

  const gstin = body.gstin.trim().toUpperCase();
  if (gstin.length !== 15) {
    res.status(400).json({ error: "GSTIN must be 15 characters." });
    return;
  }

  const passwordHash = await bcrypt.hash(body.password, BCRYPT_ROUNDS);
  const id = newId("user");
  const email = `${id.replace(/_/g, ".")}@traderoute.demo`;

  await db.insert(usersTable).values({
    id,
    name: body.name.trim(),
    email,
    role: body.role,
    companyName: body.companyName.trim(),
    description: "",
    phone: phoneNumber,
    phoneNumber,
    idProofType: body.idProofType,
    idProofNumber: body.idProofNumber.trim().toUpperCase(),
    gstin,
    city: body.city ?? null,
    passwordHash,
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) {
    res.status(500).json({ error: "Failed to create account" });
    return;
  }

  await db.insert(activityTable).values({
    id: newId("act"),
    type: "user_joined",
    title: "New account created",
    description: `${user.companyName} (${user.role}) joined TradeRoute`,
    ownerId: user.id,
    counterpartId: null,
    relatedId: user.id,
  });

  await createSession(res, user.id);
  res.json(SignupWithPhoneResponse.parse(serializeUser(user)));
});

export default router;
