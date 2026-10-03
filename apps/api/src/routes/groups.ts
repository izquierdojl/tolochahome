import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, count, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { bookmarks, groups } from "../db/schema.js";
import type { AppConfig } from "../config/env.js";
import { HttpError } from "../errors.js";
import { borrarImagen } from "../lib/imagenes.js";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth.js";

export interface GroupsDeps {
  db: Db;
  config: AppConfig;
}

export const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "El color debe ser hexadecimal (#rrggbb)");

export const grupoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(100, "El nombre no puede superar los 100 caracteres"),
  color: colorSchema.optional(),
});

export interface GrupoVista {
  id: string;
  nombre: string;
  orden: number;
  favoritos: number;
  color: string | null;
}

function aVista(fila: typeof groups.$inferSelect, favoritos: number): GrupoVista {
  return {
    id: fila.id,
    nombre: fila.nombre,
    orden: fila.orden,
    favoritos,
    color: fila.color ?? null,
  };
}

/** Conteos de favoritos propios por grupo. */
function conteos(db: Db, userId: string): Map<string, number> {
  const filas = db
    .select({ groupId: bookmarks.groupId, total: count() })
    .from(bookmarks)
    .where(eq(bookmarks.userId, userId))
    .groupBy(bookmarks.groupId)
    .all();
  return new Map(filas.map((f) => [f.groupId, f.total]));
}

export function createGroupsRouter({ db, config }: GroupsDeps): Router {
  const router = Router();
  const auth = requireAuth(config.jwtAccessSecret);

  router.get("/", auth, (req: AuthRequest, res, next) => {
    try {
      const userId = req.auth!.userId;
      const filas = db
        .select()
        .from(groups)
        .where(eq(groups.userId, userId))
        .orderBy(groups.orden)
        .all();
      const porGrupo = conteos(db, userId);
      res.json({ grupos: filas.map((f) => aVista(f, porGrupo.get(f.id) ?? 0)) });
    } catch (err) {
      next(err);
    }
  });

  router.post("/", auth, async (req: AuthRequest, res, next) => {
    try {
      const { nombre, color } = grupoSchema.parse(req.body);
      const propios = db
        .select({ orden: groups.orden })
        .from(groups)
        .where(eq(groups.userId, req.auth!.userId))
        .all();
      const siguiente = propios.length === 0 ? 0 : Math.max(...propios.map((g) => g.orden)) + 1;
      const fila = {
        id: randomUUID(),
        userId: req.auth!.userId,
        nombre,
        orden: siguiente,
        color: color ?? null,
      };
      db.insert(groups).values(fila).run();
      res.status(201).json({ grupo: aVista(fila, 0) });
    } catch (err) {
      next(err);
    }
  });

  router.put("/:id", auth, async (req: AuthRequest, res, next) => {
    try {
      const { nombre, orden, color } = z
        .object({
          nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100).optional(),
          orden: z.number().int().min(0).optional(),
          color: colorSchema.nullable().optional(),
        })
        .parse(req.body);
      if (nombre === undefined && orden === undefined && color === undefined) {
        throw new HttpError(400, "DATOS_INVALIDOS", "Indica nombre, orden o color");
      }
      const userId = req.auth!.userId;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const actual = db
        .select()
        .from(groups)
        .where(and(eq(groups.id, id), eq(groups.userId, userId)))
        .get();
      if (!actual) {
        throw new HttpError(404, "GRUPO_NO_ENCONTRADO", "Grupo no encontrado");
      }
      if (nombre !== undefined) {
        db.update(groups).set({ nombre }).where(eq(groups.id, actual.id)).run();
      }
      if (color !== undefined) {
        db.update(groups).set({ color }).where(eq(groups.id, actual.id)).run();
      }
      if (orden !== undefined) {
        reordenar(db, userId, actual.id, orden);
      }
      const filas = db
        .select()
        .from(groups)
        .where(eq(groups.userId, userId))
        .orderBy(groups.orden)
        .all();
      const modificado = filas.find((g) => g.id === actual.id)!;
      const porGrupo = conteos(db, userId);
      res.json({
        grupo: aVista(modificado, porGrupo.get(modificado.id) ?? 0),
        grupos: filas.map((f) => aVista(f, porGrupo.get(f.id) ?? 0)),
      });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", auth, (req: AuthRequest, res, next) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const userId = req.auth!.userId;
      // La cascada SQL borra las filas; los ficheros de imagen se limpian aquí.
      const imagenes = db
        .select({ imagen: bookmarks.imagen })
        .from(bookmarks)
        .where(and(eq(bookmarks.groupId, id), eq(bookmarks.userId, userId)))
        .all();
      const borrados = db
        .delete(groups)
        .where(and(eq(groups.id, id), eq(groups.userId, userId)))
        .run().changes;
      if (borrados === 0) {
        throw new HttpError(404, "GRUPO_NO_ENCONTRADO", "Grupo no encontrado");
      }
      for (const f of imagenes) borrarImagen(config.imagenesDir, f.imagen);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/**
 * Mueve un grupo a la posición destino y reasigna órdenes contiguos 0..n
 * en una sola pasada (último en escribir gana, sin corrupción).
 */
export function reordenar(db: Db, userId: string, id: string, destino: number): void {
  const filas = db
    .select()
    .from(groups)
    .where(eq(groups.userId, userId))
    .orderBy(groups.orden)
    .all();
  const resto = filas.filter((g) => g.id !== id);
  const posicion = Math.max(0, Math.min(destino, resto.length));
  resto.splice(posicion, 0, filas.find((g) => g.id === id)!);
  resto.forEach((g, i) => {
    if (g.orden !== i) {
      db.update(groups).set({ orden: i }).where(eq(groups.id, g.id)).run();
    }
  });
}
