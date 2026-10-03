import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { refreshTokens, passwordResetTokens, users } from "../db/schema.js";
import type { AppConfig } from "../config/env.js";
import { HttpError } from "../errors.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { clearRefreshCookie, getRefreshCookie, setRefreshCookie } from "../lib/cookies.js";
import { hashToken, newOpaqueToken, signAccessToken } from "../lib/tokens.js";
import { issueSession } from "../lib/session.js";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth.js";

export interface AuthDeps {
  db: Db;
  config: AppConfig;
}

export const registroSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email no válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(200),
});

export const credencialesSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email no válido"),
  password: z.string().min(1, "La contraseña es obligatoria").max(200),
});

/** Validez del token de restablecimiento: 1 hora, un solo uso. */
const RESET_TTL_MS = 3_600_000;
export function createAuthRouter({ db, config }: AuthDeps): Router {
  const router = Router();

  router.post("/registro", async (req, res, next) => {
    try {
      if (!config.registrationEnabled) {
        throw new HttpError(403, "REGISTRO_CERRADO", "El registro de nuevas cuentas está cerrado");
      }
      const { email, password } = registroSchema.parse(req.body);
      const existente = db.select().from(users).where(eq(users.email, email)).get();
      if (existente) {
        throw new HttpError(409, "EMAIL_EN_USO", "Ese email ya está registrado");
      }
      const now = Date.now();
      const usuario = {
        id: randomUUID(),
        email,
        passwordHash: await hashPassword(password),
        createdAt: now,
        updatedAt: now,
      };
      db.insert(users).values(usuario).run();
      const session = await issueSession(db, config, { id: usuario.id, email });
      setRefreshCookie(res, session.refreshToken, config.jwtRefreshTtlMs, config.isProduction);
      res.status(201).json({
        usuario: { id: usuario.id, email },
        accessToken: session.accessToken,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const { email, password } = credencialesSchema.parse(req.body);
      const cuenta = db.select().from(users).where(eq(users.email, email)).get();
      // Comparación siempre contra un hash (real o ficticio): no revela si el email existe.
      const valida = await verifyPassword(password, cuenta?.passwordHash);
      if (!cuenta || !valida) {
        throw new HttpError(401, "CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos");
      }
      const session = await issueSession(db, config, { id: cuenta.id, email: cuenta.email });
      setRefreshCookie(res, session.refreshToken, config.jwtRefreshTtlMs, config.isProduction);
      res.json({
        usuario: { id: cuenta.id, email: cuenta.email },
        accessToken: session.accessToken,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post("/refresh", async (req, res, next) => {
    try {
      const presented = getRefreshCookie(req);
      if (!presented) {
        throw new HttpError(401, "NO_AUTORIZADO", "Sesión no válida o caducada");
      }
      const now = Date.now();
      const row = db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, hashToken(presented)))
        .get();
      if (!row || row.revokedAt !== null || row.expiresAt <= now) {
        if (row) revokeUserSessions(db, row.userId, now);
        throw new HttpError(401, "NO_AUTORIZADO", "Sesión no válida o caducada");
      }
      const cuenta = db.select().from(users).where(eq(users.id, row.userId)).get();
      if (!cuenta) {
        throw new HttpError(401, "NO_AUTORIZADO", "Sesión no válida o caducada");
      }
      // Token ya rotado: dentro de la gracia se renueva el acceso sin rotar de nuevo.
      if (row.rotatedAt !== null) {
        if (now - row.rotatedAt > config.refreshGraceMs) {
          // Reutilización fuera de gracia: posible robo → revoca la cadena del usuario.
          revokeUserSessions(db, row.userId, now);
          throw new HttpError(401, "NO_AUTORIZADO", "Sesión no válida o caducada");
        }
        const accessToken = await signAccessToken(
          config.jwtAccessSecret,
          { userId: cuenta.id, email: cuenta.email },
          config.jwtAccessTtlMs,
        );
        res.json({ usuario: { id: cuenta.id, email: cuenta.email }, accessToken });
        return;
      }
      // Token activo: solo rota al acercarse el final de su vida.
      if (row.expiresAt - now > config.refreshRotateThresholdMs) {
        const accessToken = await signAccessToken(
          config.jwtAccessSecret,
          { userId: cuenta.id, email: cuenta.email },
          config.jwtAccessTtlMs,
        );
        res.json({ usuario: { id: cuenta.id, email: cuenta.email }, accessToken });
        return;
      }
      const nuevo = newOpaqueToken();
      db.insert(refreshTokens)
        .values({
          tokenHash: hashToken(nuevo),
          userId: cuenta.id,
          createdAt: now,
          expiresAt: now + config.jwtRefreshTtlMs,
        })
        .run();
      db.update(refreshTokens)
        .set({ rotatedAt: now, replacedBy: hashToken(nuevo) })
        .where(eq(refreshTokens.tokenHash, row.tokenHash))
        .run();
      setRefreshCookie(res, nuevo, config.jwtRefreshTtlMs, config.isProduction);
      const accessToken = await signAccessToken(
        config.jwtAccessSecret,
        { userId: cuenta.id, email: cuenta.email },
        config.jwtAccessTtlMs,
      );
      res.json({ usuario: { id: cuenta.id, email: cuenta.email }, accessToken });
    } catch (err) {
      next(err);
    }
  });

  router.post("/logout", async (req, res, next) => {
    try {
      // Idempotente: sin token o con token inválido también responde éxito.
      const presented = getRefreshCookie(req);
      if (presented) {
        const now = Date.now();
        db.update(refreshTokens)
          .set({ revokedAt: now })
          .where(eq(refreshTokens.tokenHash, hashToken(presented)))
          .run();
      }
      clearRefreshCookie(res, config.isProduction);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.get("/yo", requireAuth(config.jwtAccessSecret), (req: AuthRequest, res) => {
    res.json({ usuario: { id: req.auth!.userId, email: req.auth!.email } });
  });

  router.post("/password/reset-request", async (req, res, next) => {
    try {
      const { email } = z
        .object({ email: z.string().trim().toLowerCase().email() })
        .parse(req.body);
      // Respuesta siempre éxito para no revelar si el email existe.
      const cuenta = db.select().from(users).where(eq(users.email, email)).get();
      if (cuenta) {
        const token = newOpaqueToken();
        const now = Date.now();
        db.insert(passwordResetTokens)
          .values({
            tokenHash: hashToken(token),
            userId: cuenta.id,
            createdAt: now,
            expiresAt: now + RESET_TTL_MS,
          })
          .run();
        // Sin envío de email en este change (ver diseño): el token queda en el
        // log del servidor para que el administrador lo entregue al usuario.
        console.log(`Token de restablecimiento para ${cuenta.email}: ${token}`);
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.post("/password/reset-confirm", async (req, res, next) => {
    try {
      const { token, password } = z
        .object({
          token: z.string().min(1, "Token obligatorio"),
          password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(200),
        })
        .parse(req.body);
      const now = Date.now();
      const row = db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.tokenHash, hashToken(token)))
        .get();
      if (!row || row.usedAt !== null) {
        throw new HttpError(400, "TOKEN_INVALIDO", "Token no válido o ya utilizado");
      }
      if (row.expiresAt <= now) {
        throw new HttpError(410, "TOKEN_CADUCADO", "El token ha caducado");
      }
      db.update(users)
        .set({ passwordHash: await hashPassword(password), updatedAt: now })
        .where(eq(users.id, row.userId))
        .run();
      db.update(passwordResetTokens)
        .set({ usedAt: now })
        .where(eq(passwordResetTokens.tokenHash, row.tokenHash))
        .run();
      revokeUserSessions(db, row.userId, now);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/** Revoca todas las sesiones de renovación del usuario (robo o cierre). */
export function revokeUserSessions(db: Db, userId: string, now: number): void {
  db.update(refreshTokens)
    .set({ revokedAt: now })
    .where(eq(refreshTokens.userId, userId))
    .run();
}
