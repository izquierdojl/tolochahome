import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  /** Acento visual propio (`#rrggbb`) o NULL para el del tema. */
  color: text("color"),
});

/** Favoritos del speed dial: pertenecen a un grupo y a un usuario (doble FK en cascada). */
export const bookmarks = sqliteTable("bookmarks", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  url: text("url").notNull(),
  orden: integer("orden").notNull(),
  visitas: integer("visitas").notNull().default(0),
  /** Fichero de imagen propia en el almacén (`imagenes/`), o NULL para favicon. */
  imagen: text("imagen"),
});

/** Buscadores configurables por usuario para la barra de búsqueda directa. */
export const searchEngines = sqliteTable("search_engines", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  urlTemplate: text("url_template").notNull(),
  alias: text("alias").notNull(),
  sugerenciasUrl: text("sugerencias_url"),
  orden: integer("orden").notNull(),
  porDefecto: integer("por_defecto").notNull().default(0),
});

/** Ciudades meteorológicas por usuario para el chip de tiempo (Open-Meteo). */
export const weatherLocations = sqliteTable("weather_locations", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  nombre: text("nombre").notNull(),
  lat: real("lat").notNull(),
  lon: real("lon").notNull(),
  orden: integer("orden").notNull(),
  porDefecto: integer("por_defecto").notNull().default(0),
});
