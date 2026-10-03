import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

export type Db = BetterSQLite3Database<typeof schema>;

let singleton: Db | undefined;

const handles = new WeakMap<object, { close(): void }>();

/** Crea una conexión Drizzle sobre el fichero (o `:memory:`) indicado. */
export function createDb(path: string): Db {
  const sqlite = new Database(path);
  if (path !== ":memory:") {
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
  } else {
    sqlite.pragma("foreign_keys = ON");
  }
  const db = drizzle(sqlite, { schema });
  handles.set(db, sqlite);
  return db;
}

/** Cierra la conexión subyacente (necesario en tests para borrar la BD temporal). */
export function closeDb(db: Db): void {
  handles.get(db)?.close();
}

/** Conexión compartida de la aplicación (DATABASE_PATH o ./data/tolochahome.db). */
export function getDb(dbPath?: string): Db {
  if (!singleton) {
    singleton = createDb(dbPath ?? process.env.DATABASE_PATH ?? "./data/tolochahome.db");
  }
  return singleton;
}
