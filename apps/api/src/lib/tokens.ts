import { randomBytes, createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export interface AccessClaims {
  userId: string;
  email: string;
}

/** JWT de acceso de corta duración (vive en memoria del cliente, nunca en BD). */
export async function signAccessToken(
  secret: string,
  claims: AccessClaims,
  ttlMs: number,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email: claims.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuedAt(now)
    .setExpirationTime(now + Math.max(1, Math.floor(ttlMs / 1000)))
    .sign(new TextEncoder().encode(secret));
}

/** Verifica el access token. Lanza si falta, está caducado o la firma no vale. */
export async function verifyAccessToken(secret: string, token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
    algorithms: ["HS256"],
  });
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("Token sin identidad");
  }
  return { userId: payload.sub, email: payload.email };
}

/** Token opaco aleatorio (refresh / reset). En BD solo se guarda su hash. */
export function newOpaqueToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
