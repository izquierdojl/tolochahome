/**
 * Cita del día de es.wikiquote.
 *
 * La comunidad publica cada día una plantilla `Plantilla:MMDD` con la forma
 * `{{#switch: {{{año|…}}} | 2011={{CitaDía|texto|autor|página|descripción|Imagen=…}} | #default=… }}`.
 * Este módulo descarga su wikitext, elige la entrada que corresponde y la deja
 * en texto plano. Las funciones de análisis son puras; la red y el reloj se
 * inyectan en `crearServicioCita` para poder probarlo sin Wikimedia.
 */

const API_URL = "https://es.wikiquote.org/w/api.php";
const WIKI_URL = "https://es.wikiquote.org/wiki/";
const USER_AGENT = "TolochaHome/cita";
const TIMEOUT_MS = 8000;
const RESPUESTA_MAX = 256 * 1024;
const ESPERA_TRAS_FALLO_MS = 10 * 60 * 1000;

export const ATRIBUCION = {
  fuente: "Wikiquote",
  licencia: "CC BY-SA 4.0",
  licenciaUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.es",
} as const;

export interface CitaWiki {
  texto: string;
  autor: string;
  /** Nombre de la página del autor en Wikiquote (por defecto, el propio autor). */
  pagina: string;
  descripcion?: string;
}

export interface Cita {
  texto: string;
  autor: string;
  descripcion?: string;
  /** Día local de la cita, `AAAA-MM-DD`. */
  fecha: string;
  enlace: string;
  atribucion: typeof ATRIBUCION;
}

// ---------------------------------------------------------------------------
// Análisis del wikitext
// ---------------------------------------------------------------------------

/**
 * Divide por `|` solo en el nivel superior: ignora las barras que están dentro
 * de `{{ … }}` o `[[ … ]]` (por ejemplo, `[[Filosofía|Filósofo]]`).
 * Las llaves triples de los parámetros (`{{{año|…}}}`) quedan equilibradas al
 * emparejar de izquierda a derecha.
 */
export function dividirPorBarra(texto: string): string[] {
  const partes: string[] = [];
  let profundidad = 0;
  let inicio = 0;
  for (let i = 0; i < texto.length; i++) {
    const par = texto[i] + (texto[i + 1] ?? "");
    if (par === "{{" || par === "[[") {
      profundidad++;
      i++;
    } else if (par === "}}" || par === "]]") {
      profundidad = Math.max(0, profundidad - 1);
      i++;
    } else if (texto[i] === "|" && profundidad === 0) {
      partes.push(texto.slice(inicio, i));
      inicio = i + 1;
    }
  }
  partes.push(texto.slice(inicio));
  return partes;
}

/** Posición justo después del `}}` que cierra la plantilla abierta en `inicio`; -1 si no cierra. */
function finDePlantilla(texto: string, inicio: number): number {
  let profundidad = 0;
  for (let i = inicio; i < texto.length; i++) {
    const par = texto[i] + (texto[i + 1] ?? "");
    if (par === "{{") {
      profundidad++;
      i++;
    } else if (par === "}}") {
      profundidad--;
      i++;
      if (profundidad === 0) return i + 1;
    }
  }
  return -1;
}

const ENTIDADES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

function decodificarEntidades(texto: string): string {
  return texto.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (todo, dec, hex, nombre) => {
    if (dec || hex) {
      const codigo = dec ? Number(dec) : parseInt(hex, 16);
      return codigo > 0 && codigo <= 0x10ffff ? String.fromCodePoint(codigo) : todo;
    }
    return ENTIDADES[String(nombre).toLowerCase()] ?? todo;
  });
}

/** Marcado wiki → texto plano visible. */
export function limpiarWiki(marcado: string): string {
  let t = marcado;
  t = t.replace(/<ref\b[^>]*\/>/gi, "").replace(/<ref\b[^>]*>[\s\S]*?<\/ref>/gi, "");
  // Plantillas anidadas (de dentro hacia fuera).
  for (let previo = ""; previo !== t; ) {
    previo = t;
    t = t.replace(/\{\{[^{}]*\}\}/g, "");
  }
  // Archivos y categorías no tienen texto visible.
  t = t.replace(/\[\[(?:archivo|file|imagen|image|categor[ií]a|category):[^\]]*\]\]/gi, "");
  // Enlaces internos: [[destino|texto]] → texto, [[texto]] → texto.
  for (let previo = ""; previo !== t; ) {
    previo = t;
    t = t.replace(/\[\[(?:[^\][|]*\|)?([^\][]*)\]\]/g, "$1");
  }
  // Enlaces externos: [https://x texto] → texto, [https://x] → nada.
  t = t.replace(/\[(?:https?:)?\/\/\S+\s+([^\]]+)\]/g, "$1").replace(/\[(?:https?:)?\/\/\S+\]/g, "");
  t = t.replace(/'{5}|'{3}|'{2}/g, "");
  t = t.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "");
  t = decodificarEntidades(t);
  return t.replace(/\s+/g, " ").trim();
}

/**
 * Entradas del `#switch` de la plantilla diaria: años (`"2011"`) y `"#default"`.
 * Replica MediaWiki: en una clave repetida gana la primera, salvo en `#default`,
 * donde gana la última. Otras claves (por ejemplo `#default_old`) se ignoran.
 * Si la plantilla no usa `#switch`, todo su contenido cuenta como `#default`.
 */
export function extraerEntradas(wikitext: string): Map<string, string> {
  const entradas = new Map<string, string>();
  const inicio = wikitext.search(/\{\{\s*#switch\s*:/i);
  if (inicio === -1) {
    entradas.set("#default", wikitext);
    return entradas;
  }
  const fin = finDePlantilla(wikitext, inicio);
  if (fin === -1) return entradas;
  const partes = dividirPorBarra(wikitext.slice(inicio + 2, fin - 2)).slice(1);
  for (const parte of partes) {
    const igual = parte.indexOf("=");
    if (igual === -1) continue;
    const clave = parte.slice(0, igual).trim();
    const valor = parte.slice(igual + 1).trim();
    if (clave === "#default") entradas.set(clave, valor);
    else if (/^\d{4}$/.test(clave) && !entradas.has(clave)) entradas.set(clave, valor);
  }
  return entradas;
}

/**
 * Lee `{{CitaDía|texto|autor|página|descripción|Imagen=…}}` de un valor del
 * `#switch`. Devuelve `null` si no hay plantilla o faltan texto o autor (por
 * ejemplo, «El año 2009 no fue bisiesto…»).
 */
export function extraerCitaDia(valor: string): CitaWiki | null {
  const abre = /\{\{\s*[Cc]ita[Dd][ií]a\s*\|/.exec(valor);
  if (!abre) return null;
  const fin = finDePlantilla(valor, abre.index);
  if (fin === -1) return null;
  const parametros = dividirPorBarra(valor.slice(abre.index + 2, fin - 2)).slice(1);

  const posicionales: string[] = [];
  for (const parametro of parametros) {
    const nombrado = /^\s*(imagen|[1-4])\s*=/i.exec(parametro);
    if (nombrado && /^imagen$/i.test(nombrado[1])) continue;
    if (nombrado) {
      posicionales[Number(nombrado[1]) - 1] = parametro.slice(nombrado[0].length);
    } else {
      let hueco = 0;
      while (posicionales[hueco] !== undefined) hueco++;
      posicionales[hueco] = parametro;
    }
  }

  const texto = limpiarWiki(posicionales[0] ?? "");
  const autor = limpiarWiki(posicionales[1] ?? "");
  if (!texto || !autor) return null;
  const pagina = limpiarWiki(posicionales[2] ?? "") || autor;
  const descripcion = limpiarWiki(posicionales[3] ?? "");
  return { texto, autor, pagina, ...(descripcion ? { descripcion } : {}) };
}

/** Año en curso → `#default` → año anterior más reciente que sí tenga cita. */
export function elegirCita(entradas: Map<string, string>, anio: number): CitaWiki | null {
  const anteriores = [...entradas.keys()]
    .filter((clave) => /^\d{4}$/.test(clave) && Number(clave) < anio)
    .sort()
    .reverse();
  for (const clave of [String(anio), "#default", ...anteriores]) {
    const valor = entradas.get(clave);
    if (valor === undefined) continue;
    const cita = extraerCitaDia(valor);
    if (cita) return cita;
  }
  return null;
}

export function enlaceAutor(pagina: string): string {
  return WIKI_URL + encodeURIComponent(pagina.replace(/ /g, "_"));
}

// ---------------------------------------------------------------------------
// Fecha local
// ---------------------------------------------------------------------------

function dos(n: number): string {
  return String(n).padStart(2, "0");
}

/** `AAAA-MM-DD` en la zona horaria del proceso (no en UTC). */
export function fechaLocal(d: Date): string {
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// Descarga y servicio con caché
// ---------------------------------------------------------------------------

async function leerLimitado(res: Response, max: number): Promise<string> {
  const demasiado = () => new Error("Respuesta de Wikimedia demasiado grande");
  if (Number(res.headers.get("content-length")) > max) throw demasiado();
  if (!res.body) {
    const texto = await res.text();
    if (texto.length > max) throw demasiado();
    return texto;
  }
  const lector = res.body.getReader();
  const decodificador = new TextDecoder();
  let total = 0;
  let texto = "";
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await lector.cancel();
      throw demasiado();
    }
    texto += decodificador.decode(value, { stream: true });
  }
  return texto + decodificador.decode();
}

async function descargarPlantilla(fetchFn: typeof fetch, mmdd: string): Promise<string> {
  const params = new URLSearchParams({
    action: "query",
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
    titles: `Plantilla:${mmdd}`,
    format: "json",
    formatversion: "2",
  });
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    const res = await fetchFn(`${API_URL}?${params.toString()}`, {
      signal: control.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Wikimedia respondió ${res.status}`);
    const datos = JSON.parse(await leerLimitado(res, RESPUESTA_MAX)) as {
      query?: { pages?: { missing?: boolean; revisions?: { slots?: { main?: { content?: string } } }[] }[] };
    };
    const contenido = datos.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content;
    if (typeof contenido !== "string") throw new Error(`No existe Plantilla:${mmdd}`);
    return contenido;
  } finally {
    clearTimeout(temporizador);
  }
}

export interface DepsServicioCita {
  fetch?: typeof fetch;
  ahora?: () => Date;
}

export interface ServicioCita {
  /** Cita del día, la última guardada si la fuente falla, o `null` si no hay ninguna. */
  obtener(): Promise<Cita | null>;
}

export function crearServicioCita(deps: DepsServicioCita = {}): ServicioCita {
  const fetchFn: typeof fetch = deps.fetch ?? ((...args) => globalThis.fetch(...args));
  const ahora = deps.ahora ?? (() => new Date());

  let guardada: Cita | null = null;
  let sinIntentarHasta = 0;
  let enVuelo: Promise<Cita | null> | null = null;

  async function descargar(momento: Date): Promise<Cita> {
    const mmdd = `${dos(momento.getMonth() + 1)}${dos(momento.getDate())}`;
    const wikitext = await descargarPlantilla(fetchFn, mmdd);
    const elegida = elegirCita(extraerEntradas(wikitext), momento.getFullYear());
    if (!elegida) throw new Error(`Plantilla:${mmdd} no contiene ninguna cita reconocible`);
    return {
      texto: elegida.texto,
      autor: elegida.autor,
      ...(elegida.descripcion ? { descripcion: elegida.descripcion } : {}),
      fecha: fechaLocal(momento),
      enlace: enlaceAutor(elegida.pagina),
      atribucion: ATRIBUCION,
    };
  }

  return {
    obtener() {
      const momento = ahora();
      if (guardada && guardada.fecha === fechaLocal(momento)) return Promise.resolve(guardada);
      if (momento.getTime() < sinIntentarHasta) return Promise.resolve(guardada);
      if (!enVuelo) {
        enVuelo = descargar(momento)
          .then((cita) => {
            guardada = cita;
            sinIntentarHasta = 0;
            return cita;
          })
          .catch((error: unknown) => {
            sinIntentarHasta = momento.getTime() + ESPERA_TRAS_FALLO_MS;
            console.warn("[cita] No se pudo obtener la cita del día:", error instanceof Error ? error.message : error);
            return guardada;
          })
          .finally(() => {
            enVuelo = null;
          });
      }
      return enVuelo;
    },
  };
}
