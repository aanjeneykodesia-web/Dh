import type { Request, Response, NextFunction } from "express";
import type { UserRow } from "@workspace/db";
import { loadUserFromRequest } from "../lib/session";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserRow;
      isAuthenticated(): this is AuthenticatedRequest;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: UserRow;
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await loadUserFromRequest(req);
    if (user) req.user = user;
    req.isAuthenticated = function (): this is AuthenticatedRequest {
      return Boolean(this.user);
    };
    next();
  } catch (err) {
    next(err);
  }
}
