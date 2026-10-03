import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** Cuentas de usuario. El email es único (comparación insensible a mayúsculas a nivel de aplicación). */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

/**
 * Sesiones de renovación. Se guarda el hash SHA-256 del token opaco, nunca el token.
 * `rotatedAt` marca el inicio del periodo de gracia tras rotar; `revokedAt` la revocación.
 */
export const refreshTokens = sqliteTable("refresh_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  rotatedAt: integer("rotated_at"),
  replacedBy: text("replaced_by"),
  revokedAt: integer("revoked_at"),
});

/** Tokens de restablecimiento de contraseña: un solo uso, con caducidad. */
export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
});

/** Grupos del speed dial: secciones ordenadas de favoritos, privadas por usuario. */
export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  orden: integer("orden").notNull(),
});
