import type { Request, Response } from "express";

export const REFRESH_COOKIE = "tolocha-refresh";
const COOKIE_PATH = "/api/v1/auth";

export function setRefreshCookie(res: Response, token: string, ttlMs: number, secure: boolean): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: ttlMs,
  });
}

export function clearRefreshCookie(res: Response, secure: boolean): void {
  res.cookie(REFRESH_COOKIE, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: COOKIE_PATH,
    maxAge: 0,
  });
}

export function getRefreshCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    if (part.slice(0, idx).trim() === REFRESH_COOKIE) {
      const value = decodeURIComponent(part.slice(idx + 1).trim());
      return value !== "" ? value : undefined;
    }
  }
  return undefined;
}
