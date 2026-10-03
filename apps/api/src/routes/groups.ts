import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { groups } from "../db/schema.js";
import type { AppConfig } from "../config/env.js";
import { HttpError } from "../errors.js";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth.js";

export interface GroupsDeps {
  db: Db;
  config: AppConfig;
}

export const grupoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(100, "El nombre no puede superar los 100 caracteres"),
});

export interface GrupoVista {
  id: string;
  nombre: string;
  orden: number;
  favoritos: number;
}

function aVista(fila: typeof groups.$inferSelect): GrupoVista {
  return {
    id: fila.id,
    nombre: fila.nombre,
    orden: fila.orden,
    // Sin tabla de bookmarks aún (siguiente change): el conteo queda a cero.
    favoritos: 0,
  };
}

export function createGroupsRouter({ db, config }: GroupsDeps): Router {
  const router = Router();
  const auth = requireAuth(config.jwtAccessSecret);

  router.get("/", auth, (req: AuthRequest, res, next) => {
    try {
      const filas = db
        .select()
        .from(groups)
        .where(eq(groups.userId, req.auth!.userId))
        .orderBy(groups.orden)
        .all();
      res.json({ grupos: filas.map(aVista) });
    } catch (err) {
      next(err);
    }
  });

  router.post("/", auth, async (req: AuthRequest, res, next) => {
    try {
      const { nombre } = grupoSchema.parse(req.body);
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
      };
      db.insert(groups).values(fila).run();
      res.status(201).json({ grupo: aVista(fila) });
    } catch (err) {
      next(err);
    }
  });

  router.put("/:id", auth, async (req: AuthRequest, res, next) => {
    try {
      const { nombre, orden } = z
        .object({
          nombre: z.string().trim().min(1, "El nombre es obligatorio").max(100).optional(),
          orden: z.number().int().min(0).optional(),
        })
        .parse(req.body);
      if (nombre === undefined && orden === undefined) {
        throw new HttpError(400, "DATOS_INVALIDOS", "Indica nombre u orden");
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
      res.json({ grupo: aVista(modificado), grupos: filas.map(aVista) });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", auth, (req: AuthRequest, res, next) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const borrados = db
        .delete(groups)
        .where(and(eq(groups.id, id), eq(groups.userId, req.auth!.userId)))
        .run().changes;
      if (borrados === 0) {
        throw new HttpError(404, "GRUPO_NO_ENCONTRADO", "Grupo no encontrado");
      }
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
