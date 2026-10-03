import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { IMAGEN_MAX_BYTES, MIME_A_EXT, guardarImagen } from "./imagenes.js";

/** Timeout y topes de la previsualización. */
const PREVIEW_TIMEOUT_MS = 8000;
const PREVIEW_HTML_MAX = 2 * 1024 * 1024;

export interface VistaPrevia {
  titulo: string | null;
  imagen: string | null;
}

function esPublica(ip: string): boolean {
  if (isIP(ip) === 0) return false;
  const v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(ip);
  if (v4) {
    const [, a, b] = v4.map(Number);
    if (a === 10 || a === 127) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    if (a === 0 || a >= 224) return false;
    return true;
  }
  // IPv6: rechaza loopback, link-local, multicast y única local.
  const bajo = ip.toLowerCase();
  if (bajo === "::1" || bajo.startsWith("fe80:") || bajo.startsWith("ff") || bajo.startsWith("fc") || bajo.startsWith("fd")) {
    return false;
  }
  return true;
}

/** Rechaza hosts que resuelvan a red no pública (guarda SSRF mínima). */
export async function hostPublico(hostname: string): Promise<boolean> {
  try {
    const direcciones = await lookup(hostname, { all: true });
    return direcciones.length > 0 && direcciones.every((d) => esPublica(d.address));
  } catch {
    return false;
  }
}

function metaPropiedad(html: string, propiedad: string): string | null {
  const patron = new RegExp(
    `<meta[^>]+property=["']${propiedad}["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${propiedad}["']`,
    "i",
  );
  const m = patron.exec(html);
  return (m?.[1] ?? m?.[2] ?? null)?.trim() || null;
}

function tituloDe(html: string): string | null {
  const og = metaPropiedad(html, "og:title");
  if (og) return og;
  const m = /<title[^>]*>([^<]{1,150})<\/title>/i.exec(html);
  return m?.[1]?.trim() || null;
}

async function conTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: control.signal, redirect: "follow" });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Previsualiza una URL pública: título e imagen (og:image descargada al almacén).
 * Lanza Error con mensaje en español si no hay nada aprovechable.
 */
export async function previsualizar(
  url: string,
  imagenesDir: string,
  allowPrivate = false,
): Promise<VistaPrevia> {
  let destino: URL;
  try {
    destino = new URL(url);
  } catch {
    throw new Error("URL no válida (solo http/https)");
  }
  if (destino.protocol !== "http:" && destino.protocol !== "https:") {
    throw new Error("URL no válida (solo http/https)");
  }
  if (!allowPrivate && !(await hostPublico(destino.hostname))) {
    throw new Error("No se puede previsualizar ese destino");
  }
  const res = await conTimeout(destino.toString(), PREVIEW_TIMEOUT_MS, {
    headers: { "User-Agent": "TolochaHome/preview", Accept: "text/html" },
  });
  if (!res.ok) throw new Error("No se pudo leer la página");
  const tipo = res.headers.get("content-type") ?? "";
  if (!tipo.includes("text/html")) throw new Error("La URL no es una página web");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > PREVIEW_HTML_MAX) throw new Error("La página es demasiado grande");
  const html = buf.toString("utf8");
  const titulo = tituloDe(html);
  const ogImagen = metaPropiedad(html, "og:image");
  let imagen: string | null = null;
  if (ogImagen) {
    try {
      const absoluta = new URL(ogImagen, destino).toString();
      const img = await conTimeout(absoluta, PREVIEW_TIMEOUT_MS);
      const mime = (img.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      if (img.ok && MIME_A_EXT[mime]) {
        const datos = Buffer.from(await img.arrayBuffer());
        if (datos.length > 0 && datos.length <= IMAGEN_MAX_BYTES) {
          imagen = guardarImagen(imagenesDir, mime, datos);
        }
      }
    } catch {
      imagen = null;
    }
  }
  if (!titulo && !imagen) throw new Error("La página no ofrece título ni imagen");
  return { titulo, imagen };
}
