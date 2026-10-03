import { Router } from "express";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { bookmarks, groups } from "../db/schema.js";
import type { AppConfig } from "../config/env.js";
import { HttpError } from "../errors.js";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth.js";
import {
  generarHtml,
  generarJson,
  parseNetscape,
  parsePropio,
  type GrupoExportado,
} from "../lib/intercambio.js";

export interface IntercambioDeps {
  db: Db;
  config: AppConfig;
}

const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
const COLOR_HEX = /^#[0-9a-fA-F]{6}$/;

function urlValida(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return (u.protocol === "http:" || u.protocol === "https:") && url.trim().length <= 2000;
  } catch {
    return false;
  }
}

function hostDe(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function createIntercambioRouter({ db, config }: IntercambioDeps): Router {
  const router = Router();
  const auth = requireAuth(config.jwtAccessSecret);
  const subidor = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: IMPORT_MAX_BYTES, files: 1 },
  }).single("fichero");

  router.post("/import", auth, (req: AuthRequest, res, next) => {
    subidor(req, res, (err: unknown) => {
      if (err) {
        next(new HttpError(400, "FICHERO_INVALIDO", "El fichero debe ser HTML o JSON de hasta 5 MB"));
        return;
      }
      try {
        const userId = req.auth!.userId;
        const fichero = (req as AuthRequest & { file?: Express.Multer.File }).file;
        if (!fichero || fichero.size === 0) {
          throw new HttpError(400, "FICHERO_INVALIDO", "Falta el fichero (campo «fichero»)");
        }
        const texto = fichero.buffer.toString("utf8");
        let entradas;
        try {
          entradas = texto.trimStart().startsWith("{")
            ? parsePropio(JSON.parse(texto))
            : parseNetscape(texto);
        } catch {
          throw new HttpError(400, "FICHERO_INVALIDO", "Fichero no reconocible (Netscape HTML o JSON propio)");
        }

        let gruposCreados = 0;
        let favoritosCreados = 0;
        const omitidos: { grupo: string; titulo: string; motivo: string }[] = [];

        const siguienteOrdenGrupo = () => {
          const propios = db
            .select({ orden: groups.orden })
            .from(groups)
            .where(eq(groups.userId, userId))
            .all();
          return propios.length === 0 ? 0 : Math.max(...propios.map((g) => g.orden)) + 1;
        };

        for (const entrada of entradas) {
          const nombre = entrada.nombre.trim().slice(0, 100);
          if (!nombre) continue;
          let grupo = db
            .select()
            .from(groups)
            .where(and(eq(groups.userId, userId), eq(groups.nombre, nombre)))
            .get();
          if (!grupo) {
            const color =
              entrada.color && COLOR_HEX.test(entrada.color) ? entrada.color : null;
            const fila = { id: randomUUID(), userId, nombre, orden: siguienteOrdenGrupo(), color };
            db.insert(groups).values(fila).run();
            gruposCreados += 1;
            grupo = db.select().from(groups).where(eq(groups.id, fila.id)).get()!;
          }
          const delGrupo = db
            .select()
            .from(bookmarks)
            .where(and(eq(bookmarks.userId, userId), eq(bookmarks.groupId, grupo.id)))
            .all();
          let siguiente = delGrupo.length === 0 ? 0 : Math.max(...delGrupo.map((f) => f.orden)) + 1;
          const urls = new Set(delGrupo.map((f) => f.url));
          for (const fav of entrada.favoritos) {
            const url = fav.url.trim();
            if (!urlValida(url)) {
              omitidos.push({ grupo: nombre, titulo: fav.titulo, motivo: "url-no-valida" });
              continue;
            }
            if (urls.has(url)) {
              omitidos.push({ grupo: nombre, titulo: fav.titulo, motivo: "duplicado" });
              continue;
            }
            const titulo = fav.titulo.trim().slice(0, 150) || hostDe(url);
            db.insert(bookmarks)
              .values({
                id: randomUUID(),
                groupId: grupo.id,
                userId,
                titulo,
                url,
                orden: siguiente++,
                visitas: 0,
                imagen: null,
              })
              .run();
            urls.add(url);
            favoritosCreados += 1;
          }
        }

        res.json({ creados: { grupos: gruposCreados, favoritos: favoritosCreados }, omitidos });
      } catch (e) {
        next(e);
      }
    });
  });

  router.get("/export", auth, (req: AuthRequest, res, next) => {
    try {
      const formato = req.query.formato === "json" ? "json" : req.query.formato === "html" ? "html" : null;
      if (!formato) {
        throw new HttpError(400, "FORMATO_INVALIDO", "Formato desconocido (usa html o json)");
      }
      const userId = req.auth!.userId;
      const listaGrupos = db
        .select()
        .from(groups)
        .where(eq(groups.userId, userId))
        .orderBy(groups.orden)
        .all();
      const datos: GrupoExportado[] = listaGrupos.map((g) => {
        const favs = db
          .select()
          .from(bookmarks)
          .where(and(eq(bookmarks.userId, userId), eq(bookmarks.groupId, g.id)))
          .orderBy(bookmarks.orden)
          .all();
        return {
          nombre: g.nombre,
          orden: g.orden,
          color: g.color ?? null,
          favoritos: favs.map((f) => ({ titulo: f.titulo, url: f.url, orden: f.orden })),
        };
      });
      if (formato === "json") {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="tolochahome-marcadores.json"');
        res.send(generarJson(datos));
      } else {
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="tolochahome-marcadores.html"');
        res.send(generarHtml(datos));
      }
    } catch (err) {
      next(err);
    }
  });

  return router;
}
