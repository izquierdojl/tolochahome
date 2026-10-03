import { Router } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { searchEngines } from "../db/schema.js";
import type { AppConfig } from "../config/env.js";
import { HttpError } from "../errors.js";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth.js";

export interface SuggestDeps {
  db: Db;
  config: AppConfig;
}

const TIMEOUT_MS = 5000;
const RESPUESTA_MAX = 200 * 1024;

async function conTimeout(url: string): Promise<Response> {
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { signal: control.signal, redirect: "follow" });
  } finally {
    clearTimeout(t);
  }
}

/** Normaliza a lista de textos los formatos conocidos (opensearch, DDG, genérico). */
export function normalizarSugerencias(datos: unknown): string[] {
  if (!datos) return [];
  // Opensearch / Firefox: ["q", ["s1", "s2", ...], ...]
  if (Array.isArray(datos) && datos.length >= 2 && Array.isArray(datos[1])) {
    return datos[1].filter((s): s is string => typeof s === "string").slice(0, 10);
  }
  // DuckDuckGo ac (?type=list): [{phrase}, ...] o ["s", ...]
  if (Array.isArray(datos)) {
    const textos = datos.flatMap((e) => {
      if (typeof e === "string") return [e];
      if (e && typeof e === "object") {
        const o = e as Record<string, unknown>;
        for (const clave of ["phrase", "suggestion", "text", "title"]) {
          if (typeof o[clave] === "string") return [o[clave] as string];
        }
      }
      return [];
    });
    return textos.slice(0, 10);
  }
  if (datos && typeof datos === "object") {
    const o = datos as Record<string, unknown>;
    // DuckDuckGo instantáneo: RelatedTopics [{Text} | {Topics: [{Text}]}]
    if (Array.isArray(o.RelatedTopics)) {
      const textos: string[] = [];
      for (const t of o.RelatedTopics) {
        if (typeof t === "object" && t !== null) {
          const r = t as Record<string, unknown>;
          if (typeof r.Text === "string") textos.push(r.Text);
          if (Array.isArray(r.Topics)) {
            for (const s of r.Topics) {
              if (typeof s === "object" && s !== null && typeof (s as Record<string, unknown>).Text === "string") {
                textos.push((s as Record<string, unknown>).Text as string);
              }
            }
          }
        }
        if (textos.length >= 10) break;
      }
      return textos.slice(0, 10);
    }
    if (Array.isArray(o.suggestions)) {
      return o.suggestions.filter((s): s is string => typeof s === "string").slice(0, 10);
    }
  }
  return [];
}

export function createSuggestRouter({ db, config }: SuggestDeps): Router {
  const router = Router();
  const auth = requireAuth(config.jwtAccessSecret);

  router.get("/", auth, async (req: AuthRequest, res, next) => {
    try {
      const { motor, q } = z
        .object({ motor: z.string().min(1), q: z.string().min(1).max(200) })
        .parse(req.query);
      const fila = db
        .select()
        .from(searchEngines)
        .where(and(eq(searchEngines.id, motor), eq(searchEngines.userId, req.auth!.userId)))
        .get();
      if (!fila) {
        throw new HttpError(404, "MOTOR_NO_ENCONTRADO", "Motor no encontrado");
      }
      if (!fila.sugerenciasUrl) {
        res.json({ sugerencias: [] });
        return;
      }
      try {
        const url = fila.sugerenciasUrl.replace("{q}", encodeURIComponent(q));
        const respuesta = await conTimeout(url);
        if (!respuesta.ok) {
          res.json({ sugerencias: [] });
          return;
        }
        const buf = Buffer.from(await respuesta.arrayBuffer());
        if (buf.length > RESPUESTA_MAX) {
          res.json({ sugerencias: [] });
          return;
        }
        const datos: unknown = JSON.parse(buf.toString("utf8"));
        res.json({ sugerencias: normalizarSugerencias(datos) });
      } catch {
        // Degradación silenciosa: fallo remoto nunca es 500.
        res.json({ sugerencias: [] });
      }
    } catch (err) {
      next(err);
    }
  });

  return router;
}
