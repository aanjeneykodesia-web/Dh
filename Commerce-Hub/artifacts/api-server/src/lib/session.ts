import { randomBytes } from "node:crypto";
import { db, sessionsTable, usersTable, type UserRow } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { CookieOptions, Request, Response } from "express";

const COOKIE_NAME = "tr_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

const cookieOpts: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_TTL_MS,
};

function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

export async function createSession(
  res: Response,
  userId: string,
): Promise<string> {
  const id = newId("sess");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({ id, userId, expiresAt });
  res.cookie(COOKIE_NAME, id, cookieOpts);
  return id;
}

export async function destroySession(
  req: Request,
  res: Response,
): Promise<void> {
  const sessionId = req.cookies?.[COOKIE_NAME];
  if (sessionId) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
  }
  res.clearCookie(COOKIE_NAME, { ...cookieOpts, maxAge: undefined });
}

export async function loadUserFromRequest(
  req: Request,
): Promise<UserRow | null> {
  const sessionId = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!sessionId) return null;
  const rows = await db
    .select({ user: usersTable, expiresAt: sessionsTable.expiresAt })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .where(eq(sessionsTable.id, sessionId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
    return null;
  }
  return row.user;
}
