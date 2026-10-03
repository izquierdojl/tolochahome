import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { searchEngines } from "../db/schema.js";
import type { AppConfig } from "../config/env.js";
import { HttpError } from "../errors.js";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth.js";

export interface SearchDeps {
  db: Db;
  config: AppConfig;
}

const plantillaSchema = z
  .string()
  .max(2000, "La plantilla no puede superar los 2000 caracteres")
  .refine(
    (v) => {
      try {
        const u = new URL(v.replace("{q}", "x"));
        return (u.protocol === "http:" || u.protocol === "https:") && v.includes("{q}");
      } catch {
        return false;
      }
    },
    "La plantilla debe ser una URL http/https con {q}",
  );

const aliasSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "El alias es obligatorio")
  .max(12, "El alias no puede superar los 12 caracteres");

/** Motores iniciales de cada cuenta (Google por defecto). */
const SEMILLAS: { nombre: string; alias: string; urlTemplate: string; sugerenciasUrl: string; porDefecto: boolean }[] = [
  {
    nombre: "Google",
    alias: "g",
    urlTemplate: "https://www.google.com/search?q={q}",
    sugerenciasUrl: "https://suggestqueries.google.com/complete/search?client=firefox&q={q}",
    porDefecto: true,
  },
  {
    nombre: "Wikipedia",
    alias: "w",
    urlTemplate: "https://es.wikipedia.org/wiki/Special:Search?search={q}",
    sugerenciasUrl: "https://es.wikipedia.org/w/api.php?action=opensearch&format=json&search={q}",
    porDefecto: false,
  },
  {
    nombre: "DuckDuckGo",
    alias: "d",
    urlTemplate: "https://duckduckgo.com/?q={q}",
    sugerenciasUrl: "https://duckduckgo.com/ac/?q={q}&type=list",
    porDefecto: false,
  },
];

export interface MotorVista {
  id: string;
  nombre: string;
  urlTemplate: string;
  alias: string;
  sugerenciasUrl: string | null;
  orden: number;
  porDefecto: boolean;
}

function aVista(fila: typeof searchEngines.$inferSelect): MotorVista {
  return {
    id: fila.id,
    nombre: fila.nombre,
    urlTemplate: fila.urlTemplate,
    alias: fila.alias,
    sugerenciasUrl: fila.sugerenciasUrl ?? null,
    orden: fila.orden,
    porDefecto: fila.porDefecto === 1,
  };
}

function idParam(req: AuthRequest): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

/** Crea g/w/d si el usuario aún no tiene motores. */
export function asegurarSemillas(db: Db, userId: string): void {
  const existentes = db
    .select({ id: searchEngines.id })
    .from(searchEngines)
    .where(eq(searchEngines.userId, userId))
    .all();
  if (existentes.length > 0) return;
  SEMILLAS.forEach((s, i) => {
    db.insert(searchEngines)
      .values({
        id: randomUUID(),
        userId,
        nombre: s.nombre,
        urlTemplate: s.urlTemplate,
        alias: s.alias,
        sugerenciasUrl: s.sugerenciasUrl,
        orden: i,
        porDefecto: s.porDefecto ? 1 : 0,
      })
      .run();
  });
}

export function createSearchRouter({ db, config }: SearchDeps): Router {
  const router = Router();
  const auth = requireAuth(config.jwtAccessSecret);

  const motorPropio = (userId: string, id: string) =>
    db
      .select()
      .from(searchEngines)
      .where(and(eq(searchEngines.id, id), eq(searchEngines.userId, userId)))
      .get();

  const quitarDefecto = (userId: string, excepto?: string) => {
    const filas = db
      .select()
      .from(searchEngines)
      .where(eq(searchEngines.userId, userId))
      .all();
    for (const f of filas) {
      if (f.porDefecto === 1 && f.id !== excepto) {
        db.update(searchEngines).set({ porDefecto: 0 }).where(eq(searchEngines.id, f.id)).run();
      }
    }
  };

  router.get("/", auth, (req: AuthRequest, res, next) => {
    try {
      const userId = req.auth!.userId;
      asegurarSemillas(db, userId);
      const filas = db
        .select()
        .from(searchEngines)
        .where(eq(searchEngines.userId, userId))
        .orderBy(searchEngines.orden)
        .all();
      res.json({ motores: filas.map(aVista) });
    } catch (err) {
      next(err);
    }
  });

  router.post("/", auth, async (req: AuthRequest, res, next) => {
    try {
      const { nombre, urlTemplate, alias, sugerenciasUrl, porDefecto } = z
        .object({
          nombre: z.string().trim().min(1, "El nombre es obligatorio").max(60),
          urlTemplate: plantillaSchema,
          alias: aliasSchema,
          sugerenciasUrl: plantillaSchema.optional(),
          porDefecto: z.boolean().optional(),
        })
        .parse(req.body);
      const userId = req.auth!.userId;
      asegurarSemillas(db, userId);
      const duplicado = db
        .select()
        .from(searchEngines)
        .where(and(eq(searchEngines.userId, userId), eq(searchEngines.alias, alias)))
        .get();
      if (duplicado) {
        throw new HttpError(400, "ALIAS_EN_USO", "Ese alias ya está en uso");
      }
      const propios = db
        .select({ orden: searchEngines.orden })
        .from(searchEngines)
        .where(eq(searchEngines.userId, userId))
        .all();
      const siguiente = propios.length === 0 ? 0 : Math.max(...propios.map((m) => m.orden)) + 1;
      if (porDefecto) quitarDefecto(userId);
      const fila = {
        id: randomUUID(),
        userId,
        nombre,
        urlTemplate,
        alias,
        sugerenciasUrl: sugerenciasUrl ?? null,
        orden: siguiente,
        porDefecto: porDefecto ? 1 : 0,
      };
      db.insert(searchEngines).values(fila).run();
      res.status(201).json({ motor: aVista(fila) });
    } catch (err) {
      next(err);
    }
  });

  router.put("/:id", auth, async (req: AuthRequest, res, next) => {
    try {
      const { nombre, urlTemplate, alias, sugerenciasUrl, orden, porDefecto } = z
        .object({
          nombre: z.string().trim().min(1).max(60).optional(),
          urlTemplate: plantillaSchema.optional(),
          alias: aliasSchema.optional(),
          sugerenciasUrl: plantillaSchema.nullable().optional(),
          orden: z.number().int().min(0).optional(),
          porDefecto: z.boolean().optional(),
        })
        .parse(req.body);
      if (
        nombre === undefined &&
        urlTemplate === undefined &&
        alias === undefined &&
        sugerenciasUrl === undefined &&
        orden === undefined &&
        porDefecto === undefined
      ) {
        throw new HttpError(400, "DATOS_INVALIDOS", "Indica qué cambiar");
      }
      const userId = req.auth!.userId;
      const actual = motorPropio(userId, idParam(req));
      if (!actual) {
        throw new HttpError(404, "MOTOR_NO_ENCONTRADO", "Motor no encontrado");
      }
      if (alias !== undefined && alias !== actual.alias) {
        const duplicado = db
          .select()
          .from(searchEngines)
          .where(and(eq(searchEngines.userId, userId), eq(searchEngines.alias, alias)))
          .get();
        if (duplicado) {
          throw new HttpError(400, "ALIAS_EN_USO", "Ese alias ya está en uso");
        }
        db.update(searchEngines).set({ alias }).where(eq(searchEngines.id, actual.id)).run();
      }
      if (nombre !== undefined) {
        db.update(searchEngines).set({ nombre }).where(eq(searchEngines.id, actual.id)).run();
      }
      if (urlTemplate !== undefined) {
        db.update(searchEngines).set({ urlTemplate }).where(eq(searchEngines.id, actual.id)).run();
      }
      if (sugerenciasUrl !== undefined) {
        db.update(searchEngines).set({ sugerenciasUrl }).where(eq(searchEngines.id, actual.id)).run();
      }
      if (porDefecto !== undefined) {
        if (porDefecto) quitarDefecto(userId, actual.id);
        db.update(searchEngines)
          .set({ porDefecto: porDefecto ? 1 : 0 })
          .where(eq(searchEngines.id, actual.id))
          .run();
      }
      if (orden !== undefined) {
        reordenar(db, userId, actual.id, orden);
      }
      const final = db.select().from(searchEngines).where(eq(searchEngines.id, actual.id)).get()!;
      res.json({ motor: aVista(final) });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", auth, (req: AuthRequest, res, next) => {
    try {
      const userId = req.auth!.userId;
      const actual = motorPropio(userId, idParam(req));
      if (!actual) {
        throw new HttpError(404, "MOTOR_NO_ENCONTRADO", "Motor no encontrado");
      }
      db.delete(searchEngines).where(eq(searchEngines.id, actual.id)).run();
      // Mantiene el invariante de un solo por defecto.
      if (actual.porDefecto === 1) {
        const primero = db
          .select()
          .from(searchEngines)
          .where(eq(searchEngines.userId, userId))
          .orderBy(searchEngines.orden)
          .get();
        if (primero) {
          db.update(searchEngines).set({ porDefecto: 1 }).where(eq(searchEngines.id, primero.id)).run();
        }
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/** Reordena contiguo 0..n los motores propios. */
export function reordenar(db: Db, userId: string, id: string, destino: number): void {
  const filas = db
    .select()
    .from(searchEngines)
    .where(eq(searchEngines.userId, userId))
    .orderBy(searchEngines.orden)
    .all();
  const resto = filas.filter((m) => m.id !== id);
  const posicion = Math.max(0, Math.min(destino, resto.length));
  resto.splice(posicion, 0, filas.find((m) => m.id === id)!);
  resto.forEach((m, i) => {
    if (m.orden !== i) {
      db.update(searchEngines).set({ orden: i }).where(eq(searchEngines.id, m.id)).run();
    }
  });
}
