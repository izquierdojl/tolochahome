import type { Express } from "express";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { loadEnv, type AppConfig } from "../src/config/env.js";
import { createDb, closeDb, type Db } from "../src/db/client.js";
import { runMigrations } from "../src/db/migrate.js";
import { createApp } from "../src/app.js";

export interface TestContext {
  app: Express;
  db: Db;
  config: AppConfig;
  cleanup: () => void;
}

const ACCESS_SECRET = "test-access-secret-0123456789abcdef";
const REFRESH_SECRET = "test-refresh-secret-0123456789abcdef";

/** App aislada por test: BD temporal migrada + configuración de prueba. */
export function createTestApp(overrides: Record<string, string | undefined> = {}): TestContext {
  const dir = mkdtempSync(join(tmpdir(), "tolochahome-test-"));
  const dbPath = join(dir, "test.db");
  const config = loadEnv({
    NODE_ENV: "test",
    DATABASE_PATH: dbPath,
    JWT_ACCESS_SECRET: ACCESS_SECRET,
    JWT_REFRESH_SECRET: REFRESH_SECRET,
    ...overrides,
  });
  runMigrations(dbPath);
  const db = createDb(dbPath);
  const app = createApp(db, config);
  return {
    app,
    db,
    config,
    cleanup: () => {
      closeDb(db);
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Registra una cuenta en la app dada y devuelve su access token. */
export async function registrar(app: Express, email: string, password = "secreta123"): Promise<string> {
  const res = await request(app).post("/api/v1/auth/registro").send({ email, password });
  if (res.status !== 201) throw new Error(`Registro fallido (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body.accessToken as string;
}