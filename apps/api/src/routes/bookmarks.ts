import { Router } from "express";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { join } from "node:path";
import multer from "multer";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { bookmarks, groups } from "../db/schema.js";
import type { AppConfig } from "../config/env.js";
import { HttpError } from "../errors.js";
import { previsualizar } from "../lib/preview.js";
import {
  EXT_A_TIPO,
  IMAGEN_MAX_BYTES,
  MIME_A_EXT,
  NOMBRE_FICHERO,
  borrarImagen,
  guardarImagen,
} from "../lib/imagenes.js";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth.js";

export interface BookmarksDeps {
  db: Db;
  config: AppConfig;
}

const urlSchema = z
  .string()
  .max(2000, "La URL no puede superar los 2000 caracteres")
  .refine(
    (v) => {
      try {
        const u = new URL(v);
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    },
    "URL no válida (solo http/https)",
  );

const tituloSchema = z
  .string()
  .trim()
  .min(1, "El título es obligatorio")
  .max(150, "El título no puede superar los 150 caracteres");

export interface FavoritoVista {
  id: string;
  groupId: string;
  titulo: string;
  url: string;
  orden: number;
  visitas: number;
  imagen: string | null;
}

function aVista(fila: typeof bookmarks.$inferSelect): FavoritoVista {
  return {
    id: fila.id,
    groupId: fila.groupId,
    titulo: fila.titulo,
    url: fila.url,
    orden: fila.orden,
    visitas: fila.visitas,
    imagen: fila.imagen ?? null,
  };
}

function idParam(req: AuthRequest): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

export function createBookmarksRouter({ db, config }: BookmarksDeps): Router {
  const router = Router();
  const auth = requireAuth(config.jwtAccessSecret);

  const grupoPropio = (userId: string, groupId: string) =>
    db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.userId, userId)))
      .get();

  const favoritoPropio = (userId: string, id: string) =>
    db
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.id, id), eq(bookmarks.userId, userId)))
      .get();

  router.get("/", auth, (req: AuthRequest, res, next) => {
    try {
      const userId = req.auth!.userId;
      const filtro = typeof req.query.grupo === "string" ? req.query.grupo : undefined;
      if (filtro !== undefined && !grupoPropio(userId, filtro)) {
        throw new HttpError(404, "GRUPO_NO_ENCONTRADO", "Grupo no encontrado");
      }
      const filas = db
        .select()
        .from(bookmarks)
        .where(
          filtro === undefined
            ? eq(bookmarks.userId, userId)
            : and(eq(bookmarks.userId, userId), eq(bookmarks.groupId, filtro)),
        )
        .orderBy(bookmarks.orden)
        .all();
      res.json({ favoritos: filas.map(aVista) });
    } catch (err) {
      next(err);
    }
  });

  router.post("/", auth, async (req: AuthRequest, res, next) => {
    try {
      const { groupId, titulo, url, imagen } = z
        .object({
          groupId: z.string().min(1),
          titulo: tituloSchema,
          url: urlSchema,
          imagen: z.string().regex(NOMBRE_FICHERO, "Imagen no válida").optional(),
        })
        .parse(req.body);
      const userId = req.auth!.userId;
      if (!grupoPropio(userId, groupId)) {
        throw new HttpError(404, "GRUPO_NO_ENCONTRADO", "Grupo no encontrado");
      }
      if (imagen !== undefined) adoptarImagen(config.imagenesDir, imagen);
      const delGrupo = db
        .select({ orden: bookmarks.orden })
        .from(bookmarks)
        .where(and(eq(bookmarks.userId, userId), eq(bookmarks.groupId, groupId)))
        .all();
      const siguiente = delGrupo.length === 0 ? 0 : Math.max(...delGrupo.map((f) => f.orden)) + 1;
      const fila = {
        id: randomUUID(),
        groupId,
        userId,
        titulo,
        url,
        orden: siguiente,
        visitas: 0,
        imagen: imagen ?? null,
      };
      db.insert(bookmarks).values(fila).run();
      res.status(201).json({ favorito: aVista(fila) });
    } catch (err) {
      next(err);
    }
  });

  router.post("/previsualizar", auth, async (req, res, next) => {
    try {
      const { url } = z.object({ url: z.string().min(1) }).parse(req.body);
      const vista = await previsualizar(url, config.imagenesDir, config.previewAllowPrivate);
      res.json(vista);
    } catch (err) {
      next(
        err instanceof HttpError || err instanceof z.ZodError
          ? err
          : new HttpError(400, "SIN_PREVISTA", (err as Error).message),
      );
    }
  });

  router.put("/:id", auth, async (req: AuthRequest, res, next) => {
    try {
      const { titulo, url, groupId, orden, imagen } = z
        .object({
          titulo: tituloSchema.optional(),
          url: urlSchema.optional(),
          groupId: z.string().min(1).optional(),
          orden: z.number().int().min(0).optional(),
          imagen: z.string().regex(NOMBRE_FICHERO, "Imagen no válida").nullable().optional(),
        })
        .parse(req.body);
      if (
        titulo === undefined &&
        url === undefined &&
        groupId === undefined &&
        orden === undefined &&
        imagen === undefined
      ) {
        throw new HttpError(400, "DATOS_INVALIDOS", "Indica título, url, grupo, orden o imagen");
      }
      const userId = req.auth!.userId;
      const actual = favoritoPropio(userId, idParam(req));
      if (!actual) {
        throw new HttpError(404, "FAVORITO_NO_ENCONTRADO", "Favorito no encontrado");
      }
      if (titulo !== undefined) {
        db.update(bookmarks).set({ titulo }).where(eq(bookmarks.id, actual.id)).run();
      }
      if (url !== undefined) {
        db.update(bookmarks).set({ url }).where(eq(bookmarks.id, actual.id)).run();
      }
      if (imagen !== undefined) {
        if (imagen !== null) adoptarImagen(config.imagenesDir, imagen);
        if (actual.imagen && actual.imagen !== imagen) borrarImagen(config.imagenesDir, actual.imagen);
        db.update(bookmarks).set({ imagen }).where(eq(bookmarks.id, actual.id)).run();
      }
      if (groupId !== undefined && groupId !== actual.groupId) {
        if (!grupoPropio(userId, groupId)) {
          throw new HttpError(404, "GRUPO_NO_ENCONTRADO", "Grupo no encontrado");
        }
        db.update(bookmarks).set({ groupId }).where(eq(bookmarks.id, actual.id)).run();
        compactar(db, userId, actual.groupId);
        colocar(db, userId, actual.id, groupId, orden);
      } else if (orden !== undefined) {
        colocar(db, userId, actual.id, actual.groupId, orden);
      }
      const final = db.select().from(bookmarks).where(eq(bookmarks.id, actual.id)).get()!;
      res.json({ favorito: aVista(final) });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", auth, (req: AuthRequest, res, next) => {
    try {
      const userId = req.auth!.userId;
      const actual = favoritoPropio(userId, idParam(req));
      if (!actual) {
        throw new HttpError(404, "FAVORITO_NO_ENCONTRADO", "Favorito no encontrado");
      }
      db.delete(bookmarks).where(eq(bookmarks.id, actual.id)).run();
      borrarImagen(config.imagenesDir, actual.imagen);
      compactar(db, userId, actual.groupId);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/visita", auth, (req: AuthRequest, res, next) => {
    try {
      const userId = req.auth!.userId;
      const actual = favoritoPropio(userId, idParam(req));
      if (!actual) {
        throw new HttpError(404, "FAVORITO_NO_ENCONTRADO", "Favorito no encontrado");
      }
      const visitas = actual.visitas + 1;
      db.update(bookmarks).set({ visitas }).where(eq(bookmarks.id, actual.id)).run();
      res.json({ ok: true, visitas });
    } catch (err) {
      next(err);
    }
  });

  const subidor = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: IMAGEN_MAX_BYTES, files: 1 },
  }).single("imagen");

  router.post("/:id/imagen", auth, (req: AuthRequest, res, next) => {
    subidor(req, res, (err: unknown) => {
      if (err) {
        next(new HttpError(400, "IMAGEN_INVALIDA", "La imagen debe ser png, jpeg, webp o gif de hasta 1 MB"));
        return;
      }
      try {
        const userId = req.auth!.userId;
        const actual = favoritoPropio(userId, idParam(req));
        if (!actual) {
          throw new HttpError(404, "FAVORITO_NO_ENCONTRADO", "Favorito no encontrado");
        }
        const fichero = (req as AuthRequest & { file?: Express.Multer.File }).file;
        if (!fichero || !MIME_A_EXT[fichero.mimetype]) {
          throw new HttpError(400, "IMAGEN_INVALIDA", "La imagen debe ser png, jpeg, webp o gif de hasta 1 MB");
        }
        borrarImagen(config.imagenesDir, actual.imagen);
        const nombre = guardarImagen(config.imagenesDir, fichero.mimetype, fichero.buffer);
        db.update(bookmarks).set({ imagen: nombre }).where(eq(bookmarks.id, actual.id)).run();
        const final = db.select().from(bookmarks).where(eq(bookmarks.id, actual.id)).get()!;
        res.json({ favorito: aVista(final) });
      } catch (e) {
        next(e);
      }
    });
  });

  router.delete("/:id/imagen", auth, (req: AuthRequest, res, next) => {
    try {
      const userId = req.auth!.userId;
      const actual = favoritoPropio(userId, idParam(req));
      if (!actual) {
        throw new HttpError(404, "FAVORITO_NO_ENCONTRADO", "Favorito no encontrado");
      }
      borrarImagen(config.imagenesDir, actual.imagen);
      db.update(bookmarks).set({ imagen: null }).where(eq(bookmarks.id, actual.id)).run();
      const final = db.select().from(bookmarks).where(eq(bookmarks.id, actual.id)).get()!;
      res.json({ favorito: aVista(final) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/** Servido privado de imágenes subidas: exige sesión y propiedad. */
export function createImagenesRouter({ db, config }: BookmarksDeps): Router {
  const router = Router();
  const auth = requireAuth(config.jwtAccessSecret);

  router.get("/:fichero", auth, (req: AuthRequest, res, next) => {
    try {
      const raw = req.params.fichero;
      const fichero = Array.isArray(raw) ? raw[0] : raw;
      if (!NOMBRE_FICHERO.test(fichero)) {
        throw new HttpError(404, "IMAGEN_NO_ENCONTRADA", "Imagen no encontrada");
      }
      const fila = db
        .select()
        .from(bookmarks)
        .where(and(eq(bookmarks.imagen, fichero), eq(bookmarks.userId, req.auth!.userId)))
        .get();
      if (!fila) {
        throw new HttpError(404, "IMAGEN_NO_ENCONTRADA", "Imagen no encontrada");
      }
      const ext = fichero.split(".").pop()!.toLowerCase();
      res.setHeader("Content-Type", EXT_A_TIPO[ext] ?? "application/octet-stream");
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.sendFile(join(config.imagenesDir, fichero));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/** Valida que un fichero previsualizado existe antes de asociarlo. */
export function adoptarImagen(dir: string, nombre: string): void {
  if (!NOMBRE_FICHERO.test(nombre)) {
    throw new HttpError(400, "IMAGEN_INVALIDA", "Imagen no válida");
  }
  if (!existsSync(join(dir, nombre))) {
    throw new HttpError(400, "IMAGEN_INVALIDA", "Imagen no válida");
  }
}

/** Renumera 0..n los favoritos propios de un grupo según su orden actual. */
export function compactar(db: Db, userId: string, groupId: string): void {
  const filas = db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.groupId, groupId)))
    .orderBy(bookmarks.orden)
    .all();
  filas.forEach((f, i) => {
    if (f.orden !== i) {
      db.update(bookmarks).set({ orden: i }).where(eq(bookmarks.id, f.id)).run();
    }
  });
}

/** Coloca un favorito en la posición destino de un grupo y compacta. */
function colocar(db: Db, userId: string, id: string, groupId: string, destino?: number): void {
  const filas = db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.groupId, groupId)))
    .orderBy(bookmarks.orden)
    .all();
  const resto = filas.filter((f) => f.id !== id);
  const posicion = destino === undefined ? resto.length : Math.max(0, Math.min(destino, resto.length));
  const movido = filas.find((f) => f.id === id)!;
  resto.splice(posicion, 0, movido);
  resto.forEach((f, i) => {
    if (f.orden !== i) {
      db.update(bookmarks).set({ orden: i }).where(eq(bookmarks.id, f.id)).run();
    }
  });
}
