import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, count, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { feedSettings, feeds, type EntradaFeed } from "../db/schema.js";
import type { AppConfig } from "../config/env.js";
import { HttpError } from "../errors.js";
import { normalizarUrlFeed, obtenerFeed } from "../lib/feeds.js";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth.js";

export interface FeedsDeps {
  db: Db;
  config: AppConfig;
}

const INTERVALO_DEFECTO = 30;
const INTERVALO_MIN = 15;
const INTERVALO_MAX = 720;
const MAX_FEEDS = 50;
const CONCURRENCIA = 4;

export interface FeedVista {
  id: string;
  titulo: string;
  url: string;
  sitioUrl: string | null;
  orden: number;
  actualizadoEn: number | null;
  error: string | null;
  entradas?: EntradaFeed[];
}

type FilaFeed = typeof feeds.$inferSelect;

function idParam(req: AuthRequest): string {
  return Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
}

function aVista(fila: FilaFeed, incluirEntradas: boolean): FeedVista {
  return {
    id: fila.id,
    titulo: fila.titulo,
    url: fila.url,
    sitioUrl: fila.sitioUrl ?? null,
    orden: fila.orden,
    actualizadoEn: fila.actualizadoEn ?? null,
    error: fila.error ?? null,
    ...(incluirEntradas ? { entradas: fila.entradas ?? [] } : {}),
  };
}

function leerAjustes(db: Db, userId: string): { intervaloMin: number } {
  const fila = db
    .select()
    .from(feedSettings)
    .where(eq(feedSettings.userId, userId))
    .get();
  return { intervaloMin: fila?.intervaloMin ?? INTERVALO_DEFECTO };
}

function leerFilas(db: Db, userId: string): FilaFeed[] {
  return db
    .select()
    .from(feeds)
    .where(eq(feeds.userId, userId))
    .orderBy(feeds.orden)
    .all();
}

/** Un feed toca refresco si nunca se descargó o si ya pasó su intervalo. */
function debeRefrescar(fila: FilaFeed, intervaloMin: number, ahora: number): boolean {
  const intervaloMs = intervaloMin * 60_000;
  if (!fila.actualizadoEn) {
    return !(fila.ultimoIntentoEn && ahora - fila.ultimoIntentoEn < intervaloMs);
  }
  if (ahora - fila.actualizadoEn < intervaloMs) return false;
  if (fila.error && fila.ultimoIntentoEn && ahora - fila.ultimoIntentoEn < intervaloMs) {
    return false;
  }
  return true;
}

function mensajeDeError(err: unknown): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return "No se pudo actualizar el feed";
}

function codigoDeAlta(err: unknown): string {
  const mensaje = mensajeDeError(err);
  return /descargar|tardado|respondió|redirige|dirección/.test(mensaje)
    ? "FEED_NO_DISPONIBLE"
    : "FEED_INVALIDO";
}

async function refrescarFeed(
  db: Db,
  fila: FilaFeed,
  intervaloMin: number,
  allowPrivate: boolean,
  enVuelo: Map<string, Promise<void>>,
): Promise<void> {
  const existente = enVuelo.get(fila.id);
  if (existente) return existente;

  const promesa = (async () => {
    try {
      const resultado = await obtenerFeed(fila.url, {
        etag: fila.etag,
        lastModified: fila.lastModified,
        allowPrivate,
      });
      const ahora = Date.now();
      if (resultado.noModificado) {
        db.update(feeds)
          .set({
            actualizadoEn: ahora,
            ultimoIntentoEn: ahora,
            error: null,
            etag: resultado.etag ?? fila.etag,
            lastModified: resultado.lastModified ?? fila.lastModified,
          })
          .where(eq(feeds.id, fila.id))
          .run();
        return;
      }
      db.update(feeds)
        .set({
          titulo: resultado.titulo || fila.titulo,
          sitioUrl: resultado.sitioUrl ?? fila.sitioUrl,
          entradas: resultado.entradas,
          etag: resultado.etag,
          lastModified: resultado.lastModified,
          actualizadoEn: ahora,
          ultimoIntentoEn: ahora,
          error: null,
        })
        .where(eq(feeds.id, fila.id))
        .run();
    } catch (err) {
      db.update(feeds)
        .set({
          ultimoIntentoEn: Date.now(),
          error: mensajeDeError(err).slice(0, 300),
        })
        .where(eq(feeds.id, fila.id))
        .run();
    } finally {
      enVuelo.delete(fila.id);
    }
  })();

  enVuelo.set(fila.id, promesa);
  return promesa;
}

async function refrescarTodos(
  db: Db,
  filas: FilaFeed[],
  forzar: boolean,
  intervaloMin: number,
  allowPrivate: boolean,
  enVuelo: Map<string, Promise<void>>,
): Promise<void> {
  const ahora = Date.now();
  const cola = forzar
    ? [...filas]
    : filas.filter((fila) => debeRefrescar(fila, intervaloMin, ahora));

  const trabajadores = Array.from(
    { length: Math.min(CONCURRENCIA, cola.length) },
    async () => {
      while (cola.length > 0) {
        const fila = cola.shift();
        if (!fila) return;
        await refrescarFeed(db, fila, intervaloMin, allowPrivate, enVuelo);
      }
    },
  );

  await Promise.allSettled(trabajadores);
}

export function createFeedsRouter({ db, config }: FeedsDeps): Router {
  const router = Router();
  const auth = requireAuth(config.jwtAccessSecret);
  const enVuelo = new Map<string, Promise<void>>();

  router.get("/", auth, async (req: AuthRequest, res, next) => {
    try {
      const userId = req.auth!.userId;
      const resumen = req.query.resumen === "1";
      const ajustes = leerAjustes(db, userId);
      let filas = leerFilas(db, userId);

      if (!resumen && filas.length > 0) {
        await refrescarTodos(
          db,
          filas,
          false,
          ajustes.intervaloMin,
          config.feedsAllowPrivate,
          enVuelo,
        );
        filas = leerFilas(db, userId);
      }

      res.json({ feeds: filas.map((fila) => aVista(fila, !resumen)), ajustes });
    } catch (err) {
      next(err);
    }
  });

  router.post("/", auth, async (req: AuthRequest, res, next) => {
    try {
      const { url } = z
        .object({ url: z.string().trim().min(1, "La URL es obligatoria") })
        .parse(req.body);

      let normalizada: string;
      try {
        normalizada = normalizarUrlFeed(url);
      } catch (err) {
        throw new HttpError(400, codigoDeAlta(err), mensajeDeError(err));
      }

      const userId = req.auth!.userId;
      const total = db
        .select({ total: count() })
        .from(feeds)
        .where(eq(feeds.userId, userId))
        .get();
      if ((total?.total ?? 0) >= MAX_FEEDS) {
        throw new HttpError(
          400,
          "DEMASIADOS_FEEDS",
          `Puedes tener como máximo ${MAX_FEEDS} feeds.`,
        );
      }

      const duplicado = db
        .select()
        .from(feeds)
        .where(and(eq(feeds.userId, userId), eq(feeds.url, normalizada)))
        .get();
      if (duplicado) {
        throw new HttpError(409, "FEED_DUPLICADO", "Ya sigues ese feed.");
      }

      let resultado;
      try {
        resultado = await obtenerFeed(normalizada, {
          allowPrivate: config.feedsAllowPrivate,
        });
      } catch (err) {
        throw new HttpError(400, codigoDeAlta(err), mensajeDeError(err));
      }

      if (resultado.noModificado) {
        throw new HttpError(400, "FEED_INVALIDO", "No se pudo leer el feed.");
      }

      const duplicadoFinal = db
        .select()
        .from(feeds)
        .where(and(eq(feeds.userId, userId), eq(feeds.url, resultado.urlFeed)))
        .get();
      if (duplicadoFinal) {
        throw new HttpError(409, "FEED_DUPLICADO", "Ya sigues ese feed.");
      }

      const propias = db
        .select({ orden: feeds.orden })
        .from(feeds)
        .where(eq(feeds.userId, userId))
        .all();
      const siguiente =
        propias.length === 0 ? 0 : Math.max(...propias.map((fila) => fila.orden)) + 1;
      const ahora = Date.now();
      const fila: FilaFeed = {
        id: randomUUID(),
        userId,
        url: resultado.urlFeed,
        titulo: resultado.titulo,
        sitioUrl: resultado.sitioUrl,
        orden: siguiente,
        actualizadoEn: ahora,
        ultimoIntentoEn: ahora,
        error: null,
        etag: resultado.etag,
        lastModified: resultado.lastModified,
        entradas: resultado.entradas,
      };

      try {
        db.insert(feeds).values(fila).run();
      } catch (err) {
        if (String(err).includes("UNIQUE")) {
          throw new HttpError(409, "FEED_DUPLICADO", "Ya sigues ese feed.");
        }
        throw err;
      }

      res.status(201).json({ feed: aVista(fila, true) });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", auth, (req: AuthRequest, res, next) => {
    try {
      const userId = req.auth!.userId;
      const id = idParam(req);
      const fila = db
        .select()
        .from(feeds)
        .where(and(eq(feeds.id, id), eq(feeds.userId, userId)))
        .get();
      if (!fila) {
        throw new HttpError(404, "FEED_NO_ENCONTRADO", "Feed no encontrado");
      }
      db.delete(feeds).where(eq(feeds.id, id)).run();
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.put("/ajustes", auth, (req: AuthRequest, res, next) => {
    try {
      const { intervaloMin } = z
        .object({
          intervaloMin: z
            .number()
            .int()
            .min(INTERVALO_MIN, "El intervalo mínimo es de 15 minutos")
            .max(INTERVALO_MAX, "El intervalo máximo es de 12 horas"),
        })
        .parse(req.body);
      const userId = req.auth!.userId;
      db.insert(feedSettings)
        .values({ userId, intervaloMin })
        .onConflictDoUpdate({
          target: feedSettings.userId,
          set: { intervaloMin },
        })
        .run();
      res.json({ ajustes: { intervaloMin } });
    } catch (err) {
      next(err);
    }
  });

  router.post("/refrescar", auth, async (req: AuthRequest, res, next) => {
    try {
      const userId = req.auth!.userId;
      const ajustes = leerAjustes(db, userId);
      let filas = leerFilas(db, userId);

      if (filas.length > 0) {
        await refrescarTodos(
          db,
          filas,
          true,
          ajustes.intervaloMin,
          config.feedsAllowPrivate,
          enVuelo,
        );
        filas = leerFilas(db, userId);
      }

      res.json({ feeds: filas.map((fila) => aVista(fila, true)), ajustes });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export { INTERVALO_MAX, INTERVALO_MIN, MAX_FEEDS };
