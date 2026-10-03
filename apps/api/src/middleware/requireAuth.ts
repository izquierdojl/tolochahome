import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../errors.js";
import { verifyAccessToken } from "../lib/tokens.js";

export interface AuthContext {
  userId: string;
  email: string;
}

export type AuthRequest = Request & { auth?: AuthContext };

/** Exige `Authorization: Bearer <access>`. Sin sesión válida responde 401. */
export function requireAuth(secret: string) {
  return async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const header = req.headers.authorization ?? "";
      const [scheme, token] = header.split(" ");
      if (scheme !== "Bearer" || !token) {
        throw new HttpError(401, "NO_AUTORIZADO", "Sesión no válida o caducada");
      }
      req.auth = await verifyAccessToken(secret, token);
      next();
    } catch (err) {
      next(
        err instanceof HttpError
          ? err
          : new HttpError(401, "NO_AUTORIZADO", "Sesión no válida o caducada"),
      );
    }
  };
}
