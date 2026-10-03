import dotenv from "dotenv";

// Carga .env del workspace o de la raíz del monorepo (lo primero que exista gana).
dotenv.config({ path: [".env", "../../.env"] });

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { loadEnv } from "./config/env.js";
import { getDb } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { createApp } from "./app.js";

try {
  const config = loadEnv();
  if (config.databasePath !== ":memory:") {
    mkdirSync(dirname(config.databasePath), { recursive: true });
  }
  mkdirSync(config.imagenesDir, { recursive: true });
  runMigrations(config.databasePath);
  const app = createApp(getDb(config.databasePath), config);
  app.listen(config.port, () => {
    console.log(`TolochaHome API en puerto ${config.port} (${config.nodeEnv})`);
  });
} catch (err) {
  console.error(`Arranque abortado: ${(err as Error).message}`);
  process.exit(1);
}
