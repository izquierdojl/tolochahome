import type { Db } from "../db/client.js";
import { refreshTokens } from "../db/schema.js";
import type { AppConfig } from "../config/env.js";
import { hashToken, newOpaqueToken, signAccessToken } from "./tokens.js";

export interface SessionUser {
  id: string;
  email: string;
}

export interface IssuedSession {
  accessToken: string;
  refreshToken: string;
}

/** Emite un par de sesión: access JWT + refresh opaco persistido (hash). */
export async function issueSession(
  db: Db,
  config: AppConfig,
  user: SessionUser,
): Promise<IssuedSession> {
  const accessToken = await signAccessToken(
    config.jwtAccessSecret,
    { userId: user.id, email: user.email },
    config.jwtAccessTtlMs,
  );
  const refreshToken = newOpaqueToken();
  const now = Date.now();
  db.insert(refreshTokens)
    .values({
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      createdAt: now,
      expiresAt: now + config.jwtRefreshTtlMs,
    })
    .run();
  return { accessToken, refreshToken };
}
