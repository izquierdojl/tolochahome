import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { weatherLocations } from "../db/schema.js";
import type { AppConfig } from "../config/env.js";
import { HttpError } from "../errors.js";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth.js";

export interface WeatherDeps {
  db: Db;
  config: AppConfig;
}

const campos = {
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(60, "El nombre no puede superar los 60 caracteres"),
  lat: z
    .number()
    .min(-90, "La latitud debe estar entre -90 y 90")
    .max(90, "La latitud debe estar entre -90 y 90"),
  lon: z
    .number()
    .min(-180, "La longitud debe estar entre -180 y 180")
    .max(180, "La longitud debe estar entre -180 y 180"),
};

export interface CiudadVista {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
  orden: number;
  porDefecto: boolean;
}

function aVista(fila: typeof weatherLocations.$inferSelect): CiudadVista {
  return {
    id: fila.id,
    nombre: fila.nombre,
    lat: fila.lat,
    lon: fila.lon,
    orden: fila.orden,
    porDefecto: fila.porDefecto === 1,
  };
}

function idParam(req: AuthRequest): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

/** Reordena contiguo 0..n las ciudades propias. */
export function reordenarCiudades(db: Db, userId: string, id: string, destino: number): void {
  const filas = db
    .select()
    .from(weatherLocations)
    .where(eq(weatherLocations.userId, userId))
    .orderBy(weatherLocations.orden)
    .all();
  const resto = filas.filter((c) => c.id !== id);
  const posicion = Math.max(0, Math.min(destino, resto.length));
  resto.splice(posicion, 0, filas.find((c) => c.id === id)!);
  resto.forEach((c, i) => {
    if (c.orden !== i) {
      db.update(weatherLocations).set({ orden: i }).where(eq(weatherLocations.id, c.id)).run();
    }
  });
}

export function createWeatherRouter({ db, config }: WeatherDeps): Router {
  const router = Router();
  const auth = requireAuth(config.jwtAccessSecret);

  const ciudadPropia = (userId: string, id: string) =>
    db
      .select()
      .from(weatherLocations)
      .where(and(eq(weatherLocations.id, id), eq(weatherLocations.userId, userId)))
      .get();

  const quitarDefecto = (userId: string, excepto?: string) => {
    const filas = db
      .select()
      .from(weatherLocations)
      .where(eq(weatherLocations.userId, userId))
      .all();
    for (const f of filas) {
      if (f.porDefecto === 1 && f.id !== excepto) {
        db.update(weatherLocations).set({ porDefecto: 0 }).where(eq(weatherLocations.id, f.id)).run();
      }
    }
  };

  router.get("/", auth, (req: AuthRequest, res, next) => {
    try {
      const userId = req.auth!.userId;
      const filas = db
        .select()
        .from(weatherLocations)
        .where(eq(weatherLocations.userId, userId))
        .orderBy(weatherLocations.orden)
        .all();
      res.json({ ciudades: filas.map(aVista) });
    } catch (err) {
      next(err);
    }
  });

  router.post("/", auth, (req: AuthRequest, res, next) => {
    try {
      const { nombre, lat, lon, porDefecto } = z
        .object({ ...campos, porDefecto: z.boolean().optional() })
        .parse(req.body);
      const userId = req.auth!.userId;
      const propias = db
        .select({ orden: weatherLocations.orden })
        .from(weatherLocations)
        .where(eq(weatherLocations.userId, userId))
        .all();
      const siguiente = propias.length === 0 ? 0 : Math.max(...propias.map((c) => c.orden)) + 1;
      const seraDefecto = propias.length === 0 || porDefecto === true;
      if (seraDefecto) quitarDefecto(userId);
      const fila = {
        id: randomUUID(),
        userId,
        nombre,
        lat,
        lon,
        orden: siguiente,
        porDefecto: seraDefecto ? 1 : 0,
      };
      db.insert(weatherLocations).values(fila).run();
      res.status(201).json({ ciudad: aVista(fila) });
    } catch (err) {
      next(err);
    }
  });

  router.put("/:id", auth, (req: AuthRequest, res, next) => {
    try {
      const { nombre, lat, lon, orden, porDefecto } = z
        .object({
          nombre: campos.nombre.optional(),
          lat: campos.lat.optional(),
          lon: campos.lon.optional(),
          orden: z.number().int().min(0).optional(),
          porDefecto: z.boolean().optional(),
        })
        .parse(req.body);
      if (
        nombre === undefined &&
        lat === undefined &&
        lon === undefined &&
        orden === undefined &&
        porDefecto === undefined
      ) {
        throw new HttpError(400, "DATOS_INVALIDOS", "Indica qué cambiar");
      }
      const userId = req.auth!.userId;
      const actual = ciudadPropia(userId, idParam(req));
      if (!actual) {
        throw new HttpError(404, "CIUDAD_NO_ENCONTRADA", "Ciudad no encontrada");
      }
      if (nombre !== undefined) {
        db.update(weatherLocations).set({ nombre }).where(eq(weatherLocations.id, actual.id)).run();
      }
      if (lat !== undefined) {
        db.update(weatherLocations).set({ lat }).where(eq(weatherLocations.id, actual.id)).run();
      }
      if (lon !== undefined) {
        db.update(weatherLocations).set({ lon }).where(eq(weatherLocations.id, actual.id)).run();
      }
      if (porDefecto === true) {
        quitarDefecto(userId, actual.id);
        db.update(weatherLocations).set({ porDefecto: 1 }).where(eq(weatherLocations.id, actual.id)).run();
      }
      if (orden !== undefined) {
        reordenarCiudades(db, userId, actual.id, orden);
      }
      const final = db.select().from(weatherLocations).where(eq(weatherLocations.id, actual.id)).get()!;
      res.json({ ciudad: aVista(final) });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", auth, (req: AuthRequest, res, next) => {
    try {
      const userId = req.auth!.userId;
      const actual = ciudadPropia(userId, idParam(req));
      if (!actual) {
        throw new HttpError(404, "CIUDAD_NO_ENCONTRADA", "Ciudad no encontrada");
      }
      db.delete(weatherLocations).where(eq(weatherLocations.id, actual.id)).run();
      if (actual.porDefecto === 1) {
        const primero = db
          .select()
          .from(weatherLocations)
          .where(eq(weatherLocations.userId, userId))
          .orderBy(weatherLocations.orden)
          .get();
        if (primero) {
          db.update(weatherLocations).set({ porDefecto: 1 }).where(eq(weatherLocations.id, primero.id)).run();
        }
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
