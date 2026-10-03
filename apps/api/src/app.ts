import express, { type Express } from "express";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Db } from "./db/client.js";
import type { AppConfig } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./errors.js";
import { createAuthRouter } from "./routes/auth.js";
import { createGroupsRouter } from "./routes/groups.js";
import { createBookmarksRouter, createImagenesRouter } from "./routes/bookmarks.js";
import { createSearchRouter } from "./routes/search.js";
import { createSuggestRouter } from "./routes/suggest.js";

/** Versión del propio workspace (la que publica `bump.js`). */
function leerVersion(): string {
  try {
    const ruta = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
    const manifiesto = JSON.parse(readFileSync(ruta, "utf8")) as { version?: string };
    return manifiesto.version ?? "desconocida";
  } catch {
    return "desconocida";
  }
}

/** Visible en `/acerca-de` y para comprobar despliegues. */
export const VERSION_APP = leerVersion();

export function createApp(db: Db, config: AppConfig): Express {
  const app = express();
  // La app vive tras un proxy inverso (ver docs/despliegue.md).
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/v1/health", (_req, res) => {
    res.json({
      ok: true,
      servicio: "tolochahome",
      version: VERSION_APP,
      registroAbierto: config.registrationEnabled,
    });
  });
  app.use("/api/v1/auth", createAuthRouter({ db, config }));
  app.use("/api/v1/groups", createGroupsRouter({ db, config }));
  app.use("/api/v1/bookmarks", createBookmarksRouter({ db, config }));
  app.use("/api/v1/imagenes", createImagenesRouter({ db, config }));
  app.use("/api/v1/search-engines", createSearchRouter({ db, config }));
  app.use("/api/v1/sugerencias", createSuggestRouter({ db, config }));

  if (config.staticDir && existsSync(config.staticDir)) {
    const dir = config.staticDir;
    app.use(express.static(dir));
    // Fallback SPA: todo GET fuera de /api sirve el frontend.
    app.use((req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
      res.sendFile(join(dir, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
