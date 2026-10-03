import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
/** En src: <api>/drizzle. En dist: <api>/drizzle (copiado por el Dockerfile). */
export const MIGRATIONS_FOLDER = join(here, "..", "..", "drizzle");

/** Aplica las migraciones pendientes sobre el fichero indicado. */
export function runMigrations(dbPath: string, migrationsFolder = MIGRATIONS_FOLDER): void {
  const sqlite = new Database(dbPath);
  try {
    const db = drizzle(sqlite);
    migrate(db, { migrationsFolder });
  } finally {
    sqlite.close();
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && /migrate\.(ts|js)$/.test(process.argv[1]);

if (invokedDirectly) {
  const dbPath = process.env.DATABASE_PATH ?? "./data/tolochahome.db";
  runMigrations(dbPath);
  console.log(`Migraciones aplicadas sobre ${dbPath}`);
}
