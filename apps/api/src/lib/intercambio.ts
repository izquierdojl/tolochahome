/** Intercambio de marcadores: Netscape HTML y JSON propio. Sin dependencias. */

export interface EntradaFavorito {
  titulo: string;
  url: string;
}

export interface EntradaGrupo {
  nombre: string;
  color?: string | null;
  favoritos: EntradaFavorito[];
}

const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  "#x27": "'",
  "#34": '"',
  "#x22": '"',
};

function decodificar(texto: string): string {
  return texto.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (todo, entidad: string) => {
    if (entidad.startsWith("#")) {
      const base = entidad[1] === "x" || entidad[1] === "X" ? 16 : 10;
      const codigo = parseInt(entidad.slice(base === 16 ? 2 : 1), base);
      return Number.isFinite(codigo) ? String.fromCodePoint(codigo) : todo;
    }
    return ENTIDADES[entidad] ?? todo;
  });
}

function hostDe(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Parsea Netscape HTML tolerante (insensible a caso). Las carpetas `<H3>`
 * abren grupo; los enlaces fuera de carpeta van a «Importados».
 */
export function parseNetscape(html: string): EntradaGrupo[] {
  if (!/NETSCAPE-Bookmark/i.test(html.slice(0, 2000))) {
    throw new Error("No es un Netscape HTML reconocible");
  }
  const grupos: EntradaGrupo[] = [];
  let actual: EntradaGrupo | undefined;
  const patron =
    /<DT>\s*<H3[^>]*>([\s\S]*?)<\/H3>|<DT>\s*<A[^>]*HREF="([^"]+)"[^>]*>([\s\S]*?)<\/A>/gi;
  let m: RegExpExecArray | null;
  const limpio = (s: string) => decodificar(s.replace(/<[^>]*>/g, "")).trim();
  while ((m = patron.exec(html)) !== null) {
    if (m[1] !== undefined) {
      const nombre = limpio(m[1]) || "Importados";
      actual = grupos.find((g) => g.nombre === nombre);
      if (!actual) {
        actual = { nombre, favoritos: [] };
        grupos.push(actual);
      }
    } else {
      const url = (m[2] ?? "").trim();
      const titulo = limpio(m[3] ?? "") || hostDe(url);
      if (!actual) {
        actual = { nombre: "Importados", favoritos: [] };
        grupos.push(actual);
      }
      actual.favoritos.push({ titulo, url });
    }
  }
  if (grupos.length === 0) throw new Error("El fichero no contiene marcadores");
  return grupos;
}

/** Valida el JSON propio `{ version: 1, grupos: [...] }`. */
export function parsePropio(datos: unknown): EntradaGrupo[] {
  if (!datos || typeof datos !== "object") throw new Error("JSON no reconocible");
  const raiz = datos as Record<string, unknown>;
  if (!Array.isArray(raiz.grupos)) throw new Error("JSON no reconocible");
  const grupos: EntradaGrupo[] = [];
  for (const g of raiz.grupos) {
    if (!g || typeof g !== "object") continue;
    const o = g as Record<string, unknown>;
    if (typeof o.nombre !== "string" || o.nombre.trim() === "") continue;
    const favoritos: EntradaFavorito[] = [];
    if (Array.isArray(o.favoritos)) {
      for (const f of o.favoritos) {
        if (!f || typeof f !== "object") continue;
        const fo = f as Record<string, unknown>;
        if (typeof fo.titulo !== "string" || typeof fo.url !== "string") continue;
        favoritos.push({ titulo: fo.titulo, url: fo.url });
      }
    }
    grupos.push({
      nombre: o.nombre,
      color: typeof o.color === "string" ? o.color : null,
      favoritos,
    });
  }
  if (grupos.length === 0) throw new Error("El fichero no contiene marcadores");
  return grupos;
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface GrupoExportado {
  nombre: string;
  orden: number;
  color: string | null;
  favoritos: { titulo: string; url: string; orden: number }[];
}

/** Genera Netscape HTML con la estructura que lee el import (ida y vuelta). */
export function generarHtml(grupos: GrupoExportado[]): string {
  const lineas = [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    "<!-- Generado por TolochaHome -->",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Marcadores</TITLE>",
    "<H1>Marcadores</H1>",
    "<DL><p>",
  ];
  for (const g of grupos) {
    lineas.push(`    <DT><H3>${escaparHtml(g.nombre)}</H3>`);
    lineas.push("    <DL><p>");
    for (const f of g.favoritos) {
      lineas.push(`        <DT><A HREF="${escaparHtml(f.url)}">${escaparHtml(f.titulo)}</A>`);
    }
    lineas.push("    </DL><p>");
  }
  lineas.push("</DL><p>");
  return lineas.join("\n");
}

/** Genera el JSON propio con versión. */
export function generarJson(grupos: GrupoExportado[]): string {
  return JSON.stringify(
    {
      version: 1,
      generadoPor: "TolochaHome",
      grupos: grupos.map((g) => ({
        nombre: g.nombre,
        orden: g.orden,
        color: g.color,
        favoritos: g.favoritos.map((f) => ({ titulo: f.titulo, url: f.url, orden: f.orden })),
      })),
    },
    null,
    2,
  );
}
