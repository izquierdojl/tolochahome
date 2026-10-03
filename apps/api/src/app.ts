import express, { type Express } from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "./db/client.js";
import type { AppConfig } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./errors.js";
import { createAuthRouter } from "./routes/auth.js";
import { createGroupsRouter } from "./routes/groups.js";

export function createApp(db: Db, config: AppConfig): Express {
  const app = express();
  // La app vive tras un proxy inverso (ver docs/despliegue.md).
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/v1/health", (_req, res) => {
    res.json({ ok: true, servicio: "tolochahome" });
  });
  app.use("/api/v1/auth", createAuthRouter({ db, config }));
  app.use("/api/v1/groups", createGroupsRouter({ db, config }));

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
