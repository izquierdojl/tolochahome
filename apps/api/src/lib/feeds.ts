import { XMLParser, XMLValidator } from "fast-xml-parser";
import type { EntradaFeed } from "../db/schema.js";
import { hostPublico } from "./preview.js";

/** Límites de la descarga y del contenido normalizado. */
const TIMEOUT_MS = 8000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const MAX_ENTRADAS = 30;
const MAX_RESUMEN = 400;
const USER_AGENT = "TolochaHome/feeds";
const ACCEPT =
  "application/rss+xml, application/atom+xml, application/rdf+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5";

/** Error de dominio de feeds, con mensaje ya listo para mostrar en español. */
export class ErrorFeed extends Error {}

interface DescargaFeed {
  urlFinal: string;
  contentType: string;
  charset: string | null;
  cuerpo: Uint8Array;
  etag: string | null;
  lastModified: string | null;
  noModificado: boolean;
}

export interface OpcionesDescarga {
  etag?: string | null;
  lastModified?: string | null;
  allowPrivate?: boolean;
  timeoutMs?: number;
  maxBytes?: number;
  fetchImpl?: typeof fetch;
  validarHost?: (hostname: string) => Promise<boolean>;
}

export interface ResultadoParseo {
  titulo: string;
  sitioUrl: string | null;
  entradas: EntradaFeed[];
}

export interface ResultadoFeed extends ResultadoParseo {
  urlFeed: string;
  etag: string | null;
  lastModified: string | null;
  noModificado: boolean;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
  parseTagValue: false,
  parseAttributeValue: false,
  isArray: (nombre) => nombre === "item" || nombre === "entry",
  processEntities: true,
});

/** Normaliza una URL de feed: acepta `feed://`, añade `https://` y exige http/https. */
export function normalizarUrlFeed(entrada: string): string {
  const valor = entrada.trim();
  if (!valor) throw new ErrorFeed("Introduce una URL de feed.");

  let normalizada = valor;
  if (/^feed:\/\//i.test(normalizada)) {
    normalizada = `https://${normalizada.slice("feed://".length)}`;
  } else {
    const tieneEsquemaWeb = /^https?:\/\//i.test(normalizada);
    const tieneOtroEsquema = /^[a-z][a-z\d+.-]*:/i.test(normalizada);
    const pareceHostPuerto = /^[^/\s:]+:\d+(?:\/|$)/.test(normalizada);
    if (!tieneEsquemaWeb && !(tieneOtroEsquema && !pareceHostPuerto)) {
      normalizada = `https://${normalizada}`;
    }
  }

  let url: URL;
  try {
    url = new URL(normalizada);
  } catch {
    throw new ErrorFeed("La URL no es válida.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ErrorFeed("La URL debe usar http o https.");
  }
  if (!url.hostname) throw new ErrorFeed("La URL no es válida.");
  url.hash = "";
  return url.toString();
}

function objeto(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

function comoArray(valor: unknown): unknown[] {
  if (valor === undefined || valor === null) return [];
  return Array.isArray(valor) ? valor : [valor];
}

function texto(valor: unknown): string {
  if (typeof valor === "string") return valor;
  if (typeof valor === "number") return String(valor);
  const nodo = objeto(valor);
  const contenido = nodo["#text"];
  if (typeof contenido === "string") return contenido;
  if (typeof contenido === "number") return String(contenido);
  return "";
}

function primerTexto(valor: unknown): string {
  return texto(comoArray(valor)[0]);
}

function atributo(valor: unknown, nombre: string): string {
  const nodo = objeto(valor);
  const contenido = nodo[`@_${nombre}`];
  if (typeof contenido === "string") return contenido;
  if (typeof contenido === "number") return String(contenido);
  return "";
}

function truncar(valor: string, maximo: number): string {
  if (valor.length <= maximo) return valor;
  return `${valor.slice(0, maximo - 1).trimEnd()}…`;
}

const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  laquo: "«",
  raquo: "»",
  lsaquo: "‹",
  rsaquo: "›",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  bull: "•",
  middot: "·",
  copy: "©",
  reg: "®",
  trade: "™",
  deg: "°",
  plusmn: "±",
  times: "×",
  divide: "÷",
  micro: "µ",
  para: "¶",
  sect: "§",
  iexcl: "¡",
  iquest: "¿",
  cent: "¢",
  pound: "£",
  yen: "¥",
  euro: "€",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  sup1: "¹",
  sup2: "²",
  sup3: "³",
  dagger: "†",
  permil: "‰",
  prime: "′",
};

function decodificarEntidad(nombre: string): string {
  return ENTIDADES[nombre.toLowerCase()] ?? `&${nombre};`;
}

/** Convierte HTML del feed en texto plano, sin etiquetas ni entidades peligrosas. */
export function htmlATexto(html: string): string {
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<(script|style|iframe|object|embed|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr|section|article)>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_m: string, hex: string) => {
      const codigo = Number.parseInt(hex, 16);
      return Number.isFinite(codigo) && codigo > 0 && codigo <= 0x10ffff
        ? String.fromCodePoint(codigo)
        : "";
    })
    .replace(/&#(\d+);/g, (_m: string, decimal: string) => {
      const codigo = Number.parseInt(decimal, 10);
      return Number.isFinite(codigo) && codigo > 0 && codigo <= 0x10ffff
        ? String.fromCodePoint(codigo)
        : "";
    })
    .replace(/&([a-z][a-z0-9]+);/gi, (_m: string, nombre: string) => decodificarEntidad(nombre))
    .replace(/\s+/g, " ")
    .trim();
}

function limpiarTitulo(valor: string): string {
  return htmlATexto(valor).replace(/\s+/g, " ").trim();
}

function resolverEnlace(valor: string, base: string): string | null {
  const limpio = valor.trim();
  if (!limpio) return null;
  try {
    const url = new URL(limpio, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function hostDe(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return "Feed";
  }
}

function fechaDe(item: Record<string, unknown>): number | null {
  for (const clave of ["pubDate", "published", "updated", "dc:date", "date"]) {
    const valor = primerTexto(item[clave]);
    if (!valor) continue;
    const ms = Date.parse(valor);
    if (Number.isFinite(ms)) return ms;
  }
  return null;
}

function resumenDe(item: Record<string, unknown>): string | null {
  const candidatos = [
    item["content:encoded"],
    item.content,
    item.description,
    item.summary,
  ];
  for (const candidato of candidatos) {
    const limpio = htmlATexto(primerTexto(candidato));
    if (limpio) return truncar(limpio, MAX_RESUMEN);
  }
  return null;
}

function enlaceRss(item: Record<string, unknown>, base: string): string | null {
  const directo = resolverEnlace(primerTexto(item.link), base);
  if (directo) return directo;
  const guid = primerTexto(item.guid);
  if (/^https?:\/\//i.test(guid)) return resolverEnlace(guid, base);
  return null;
}

interface EnlaceAtom {
  href: string;
  rel: string;
  type: string;
}

function enlacesAtom(valor: unknown): EnlaceAtom[] {
  return comoArray(valor).map((bruto) => ({
    href: atributo(bruto, "href") || texto(bruto),
    rel: atributo(bruto, "rel").toLowerCase(),
    type: atributo(bruto, "type").toLowerCase(),
  }));
}

function elegirEnlaceAlternativo(enlaces: EnlaceAtom[]): EnlaceAtom | undefined {
  return (
    enlaces.find(
      (enlace) =>
        enlace.href &&
        (enlace.rel === "" || enlace.rel === "alternate") &&
        (enlace.type === "" || enlace.type.includes("html")),
    ) ??
    enlaces.find((enlace) => enlace.href && enlace.rel === "alternate") ??
    enlaces.find((enlace) => enlace.href)
  );
}

function enlaceAtom(entry: Record<string, unknown>, base: string): string | null {
  const elegido = elegirEnlaceAlternativo(enlacesAtom(entry.link));
  return elegido ? resolverEnlace(elegido.href, base) : null;
}

function enlaceSitioAtom(feed: Record<string, unknown>, base: string): string | null {
  const elegido = elegirEnlaceAlternativo(enlacesAtom(feed.link));
  return elegido ? resolverEnlace(elegido.href, base) : null;
}

function enlaceRdf(item: Record<string, unknown>, base: string): string | null {
  const directo = resolverEnlace(primerTexto(item.link), base);
  if (directo) return directo;
  const about = atributo(item, "rdf:about");
  if (/^https?:\/\//i.test(about)) return resolverEnlace(about, base);
  return null;
}

function normalizarEntradas(
  items: unknown[],
  base: string,
  enlaceDe: (item: Record<string, unknown>) => string | null,
): EntradaFeed[] {
  const vistas = new Set<string>();
  const entradas: EntradaFeed[] = [];

  for (const bruto of items) {
    const item = objeto(bruto);
    const enlace = enlaceDe(item);
    const titulo = limpiarTitulo(primerTexto(item.title));
    if (!enlace || !titulo) continue;

    const id = (primerTexto(item.guid) || primerTexto(item.id) || enlace).trim().slice(0, 500);
    if (vistas.has(id) || vistas.has(enlace)) continue;
    vistas.add(id);
    vistas.add(enlace);

    entradas.push({
      id,
      titulo: truncar(titulo, 200),
      enlace,
      resumen: resumenDe(item),
      publicadoEn: fechaDe(item),
    });
  }

  entradas.sort((a, b) => (b.publicadoEn ?? 0) - (a.publicadoEn ?? 0));
  return entradas.slice(0, MAX_ENTRADAS);
}

function parsearRss2(rss: Record<string, unknown>, base: string): ResultadoParseo {
  const canal = objeto(comoArray(rss.channel)[0]);
  const titulo = truncar(limpiarTitulo(primerTexto(canal.title)) || hostDe(base), 200);
  const sitioUrl = resolverEnlace(primerTexto(canal.link), base);
  return {
    titulo,
    sitioUrl,
    entradas: normalizarEntradas(comoArray(canal.item), base, (item) => enlaceRss(item, base)),
  };
}

function parsearAtom(feed: Record<string, unknown>, base: string): ResultadoParseo {
  const titulo = truncar(limpiarTitulo(primerTexto(feed.title)) || hostDe(base), 200);
  return {
    titulo,
    sitioUrl: enlaceSitioAtom(feed, base),
    entradas: normalizarEntradas(comoArray(feed.entry), base, (entry) => enlaceAtom(entry, base)),
  };
}

function parsearRdf(rdf: Record<string, unknown>, base: string): ResultadoParseo {
  const canal = objeto(comoArray(rdf.channel)[0]);
  const titulo = truncar(limpiarTitulo(primerTexto(canal.title)) || hostDe(base), 200);
  const sitioUrl = resolverEnlace(primerTexto(canal.link), base);
  return {
    titulo,
    sitioUrl,
    entradas: normalizarEntradas(comoArray(rdf.item), base, (item) => enlaceRdf(item, base)),
  };
}

/** Parsea RSS 2.0, Atom o RSS 1.0/RDF y normaliza sus entradas. */
export function parsearFeed(xml: string, base: string): ResultadoParseo {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) {
    throw new ErrorFeed("El feed contiene una declaración XML no permitida.");
  }
  if (XMLValidator.validate(xml) !== true) {
    throw new ErrorFeed("El feed no es un XML válido.");
  }
  let datos: unknown;
  try {
    datos = parser.parse(xml);
  } catch {
    throw new ErrorFeed("El feed no es un XML válido.");
  }
  const raiz = objeto(datos);
  if (raiz.rss !== undefined) return parsearRss2(objeto(raiz.rss), base);
  if (raiz.feed !== undefined) return parsearAtom(objeto(raiz.feed), base);
  const rdf = raiz["rdf:RDF"] ?? raiz.RDF;
  if (rdf !== undefined) return parsearRdf(objeto(rdf), base);
  throw new ErrorFeed("La URL no contiene un feed RSS/Atom válido.");
}

function atributosEtiqueta(etiqueta: string): Record<string, string> {
  const salida: Record<string, string> = {};
  const patron = /([a-z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let coincidencia: RegExpExecArray | null;
  while ((coincidencia = patron.exec(etiqueta)) !== null) {
    salida[coincidencia[1].toLowerCase()] =
      coincidencia[2] ?? coincidencia[3] ?? coincidencia[4] ?? "";
  }
  return salida;
}

/** Busca un `<link rel="alternate">` RSS/Atom en una página HTML. */
export function autodescubrirFeed(html: string, base: string): string | null {
  const etiquetas = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const etiqueta of etiquetas) {
    const attrs = atributosEtiqueta(etiqueta);
    const rel = (attrs.rel ?? "").toLowerCase().split(/\s+/);
    const type = (attrs.type ?? "").toLowerCase();
    if (!rel.includes("alternate")) continue;
    if (
      type !== "application/rss+xml" &&
      type !== "application/atom+xml" &&
      type !== "application/rdf+xml"
    ) {
      continue;
    }
    const href = attrs.href;
    if (!href) continue;
    try {
      return new URL(href, base).toString();
    } catch {
      continue;
    }
  }
  return null;
}

function charsetDe(contentType: string): string | null {
  const coincidencia = /charset\s*=\s*["']?([^;"'\s]+)/i.exec(contentType);
  return coincidencia?.[1]?.trim() ?? null;
}

function charsetDeXml(bytes: Uint8Array): string | null {
  const cabecera = new TextDecoder("ascii").decode(bytes.slice(0, 200));
  const coincidencia = /<\?xml[^>]*encoding\s*=\s*["']([^"']+)["']/i.exec(cabecera);
  return coincidencia?.[1]?.trim() ?? null;
}

function decodificar(bytes: Uint8Array, charset: string | null): string {
  let textoDecodificado: string;
  try {
    textoDecodificado = new TextDecoder(charset ?? "utf-8").decode(bytes);
  } catch {
    textoDecodificado = new TextDecoder("utf-8").decode(bytes);
  }
  return textoDecodificado.replace(/^\uFEFF/, "");
}

function esTipoXml(contentType: string): boolean {
  const tipo = contentType.toLowerCase();
  return tipo.includes("xml") || tipo.includes("rss") || tipo.includes("atom");
}

function esTipoHtml(contentType: string): boolean {
  const tipo = contentType.toLowerCase();
  return tipo.includes("text/html") || tipo.includes("application/xhtml+xml");
}

async function leerConTope(res: Response, maximo: number): Promise<Uint8Array> {
  const reader = res.body?.getReader();
  if (!reader) {
    const buffer = new Uint8Array(await res.arrayBuffer());
    if (buffer.byteLength > maximo) throw new ErrorFeed("El feed es demasiado grande.");
    return buffer;
  }

  const trozos: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maximo) {
        await reader.cancel().catch(() => undefined);
        throw new ErrorFeed("El feed es demasiado grande.");
      }
      trozos.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const salida = new Uint8Array(total);
  let offset = 0;
  for (const trozo of trozos) {
    salida.set(trozo, offset);
    offset += trozo.byteLength;
  }
  return salida;
}

async function validarDestino(
  url: URL,
  allowPrivate: boolean,
  validarHost: (hostname: string) => Promise<boolean>,
): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ErrorFeed("La URL debe usar http o https.");
  }
  if (!allowPrivate && !(await validarHost(url.hostname))) {
    throw new ErrorFeed("No se puede acceder a esa dirección.");
  }
}

/** Descarga un feed con timeout, tope de tamaño y validación SSRF en cada redirección. */
export async function descargarFeed(
  urlEntrada: string,
  opciones: OpcionesDescarga = {},
): Promise<DescargaFeed> {
  const allowPrivate = opciones.allowPrivate === true;
  const timeoutMs = opciones.timeoutMs ?? TIMEOUT_MS;
  const maxBytes = opciones.maxBytes ?? MAX_BYTES;
  const fetchImpl = opciones.fetchImpl ?? fetch;
  const validarHost = opciones.validarHost ?? hostPublico;

  let actual = new URL(normalizarUrlFeed(urlEntrada));
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: ACCEPT,
  };
  if (opciones.etag) headers["If-None-Match"] = opciones.etag;
  if (opciones.lastModified) headers["If-Modified-Since"] = opciones.lastModified;

  for (let salto = 0; salto <= MAX_REDIRECTS; salto += 1) {
    await validarDestino(actual, allowPrivate, validarHost);

    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), timeoutMs);
    try {
      const res = await fetchImpl(actual, {
        headers,
        redirect: "manual",
        signal: control.signal,
      });

      if (res.status === 304) {
        return {
          urlFinal: actual.toString(),
          contentType: "",
          charset: null,
          cuerpo: new Uint8Array(),
          etag: res.headers.get("etag"),
          lastModified: res.headers.get("last-modified"),
          noModificado: true,
        };
      }

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) throw new ErrorFeed("El feed redirige a una dirección no válida.");
        try {
          actual = new URL(location, actual);
        } catch {
          throw new ErrorFeed("El feed redirige a una dirección no válida.");
        }
        continue;
      }

      if (!res.ok) {
        throw new ErrorFeed(`El feed respondió con el código ${res.status}.`);
      }

      const contentType = res.headers.get("content-type") ?? "";
      const cuerpo = await leerConTope(res, maxBytes);
      return {
        urlFinal: actual.toString(),
        contentType,
        charset: charsetDe(contentType),
        cuerpo,
        etag: res.headers.get("etag"),
        lastModified: res.headers.get("last-modified"),
        noModificado: false,
      };
    } catch (err) {
      if (err instanceof ErrorFeed) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new ErrorFeed("El feed ha tardado demasiado en responder.");
      }
      throw new ErrorFeed("No se pudo descargar el feed.");
    } finally {
      clearTimeout(temporizador);
    }
  }

  throw new ErrorFeed("El feed redirige demasiadas veces.");
}

/**
 * Descarga y normaliza un feed. Si la URL es una página HTML, busca su
 * `<link rel="alternate">` y descarga el feed descubierto.
 */
export async function obtenerFeed(
  urlEntrada: string,
  opciones: OpcionesDescarga = {},
  profundidad = 0,
): Promise<ResultadoFeed> {
  const descarga = await descargarFeed(urlEntrada, opciones);

  if (descarga.noModificado) {
    return {
      urlFeed: descarga.urlFinal,
      titulo: "",
      sitioUrl: null,
      entradas: [],
      etag: descarga.etag,
      lastModified: descarga.lastModified,
      noModificado: true,
    };
  }

  const crudo = decodificar(
    descarga.cuerpo,
    descarga.charset ?? charsetDeXml(descarga.cuerpo),
  );
  const cabecera = crudo.slice(0, 2000);
  const pareceXml = /^\s*(?:<\?xml|<rss|<feed|<rdf:RDF|<RDF)/i.test(cabecera);
  const pareceHtml = esTipoHtml(descarga.contentType) || /<html[\s>]/i.test(cabecera);

  if (pareceXml || esTipoXml(descarga.contentType)) {
    try {
      const parseado = parsearFeed(crudo, descarga.urlFinal);
      return {
        urlFeed: descarga.urlFinal,
        ...parseado,
        etag: descarga.etag,
        lastModified: descarga.lastModified,
        noModificado: false,
      };
    } catch (err) {
      if (!pareceHtml) throw err;
    }
  }

  if (pareceHtml || /<link\b/i.test(crudo)) {
    if (profundidad >= 2) throw new ErrorFeed("No se pudo descubrir el feed.");
    const descubierto = autodescubrirFeed(crudo, descarga.urlFinal);
    if (!descubierto) {
      throw new ErrorFeed(
        "No se ha encontrado un feed en esa página. Prueba con la URL directa del feed.",
      );
    }
    if (descubierto === descarga.urlFinal) {
      throw new ErrorFeed("La página no apunta a un feed válido.");
    }
    const segundo = await obtenerFeed(descubierto, opciones, profundidad + 1);
    return { ...segundo, sitioUrl: segundo.sitioUrl ?? descarga.urlFinal };
  }

  throw new ErrorFeed("La URL no contiene un feed RSS/Atom válido.");
}
