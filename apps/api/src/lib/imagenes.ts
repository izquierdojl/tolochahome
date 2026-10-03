import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** Límite de subida: 1 MB. */
export const IMAGEN_MAX_BYTES = 1_048_576;

export const MIME_A_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const EXT_A_TIPO: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

/** Solo ficheros generados por el servidor (`<uuid>.<ext>`), sin rutas. */
export const NOMBRE_FICHERO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpe?g|webp|gif)$/;

/** Guarda el buffer y devuelve el nombre del fichero. Lanza si el tipo no vale. */
export function guardarImagen(dir: string, mime: string, datos: Buffer): string {
  const ext = MIME_A_EXT[mime];
  if (!ext) throw new Error(`Tipo de imagen no permitido: ${mime}`);
  mkdirSync(dir, { recursive: true });
  const nombre = `${randomUUID()}.${ext}`;
  writeFileSync(join(dir, nombre), datos);
  return nombre;
}

/** Borra un fichero del almacén (ignora si no existe). */
export function borrarImagen(dir: string, nombre?: string | null): void {
  if (!nombre || !NOMBRE_FICHERO.test(nombre)) return;
  rmSync(join(dir, nombre), { force: true });
}
