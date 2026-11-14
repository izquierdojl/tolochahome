import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  crearServicioCita,
  dividirPorBarra,
  elegirCita,
  enlaceAutor,
  extraerCitaDia,
  extraerEntradas,
  fechaLocal,
  limpiarWiki,
} from "../src/lib/cita.js";

/** Wikitext real de Plantilla:MMDD de es.wikiquote (ver test/fixtures). */
function plantilla(mmdd: "1114" | "0229" | "0315"): string {
  return readFileSync(new URL(`./fixtures/plantilla-${mmdd}.wiki`, import.meta.url), "utf8");
}

describe("dividirPorBarra", () => {
  it("corta solo en el nivel superior", () => {
    expect(dividirPorBarra("a|[[b|c]]|{{d|e|f}}|g")).toEqual(["a", "[[b|c]]", "{{d|e|f}}", "g"]);
  });

  it("no se descuadra con los parámetros de llaves triples", () => {
    expect(dividirPorBarra("#switch: {{{año|{{CURRENTYEAR}} }}}| 2011=x| 2012=y")).toEqual([
      "#switch: {{{año|{{CURRENTYEAR}} }}}",
      " 2011=x",
      " 2012=y",
    ]);
  });

  it("devuelve el texto entero si no hay barras", () => {
    expect(dividirPorBarra("sin barras")).toEqual(["sin barras"]);
  });
});

describe("limpiarWiki", () => {
  it("convierte los enlaces internos en su texto visible", () => {
    expect(limpiarWiki("[[Filosofía|Filósofo]] y [[naturaleza]]")).toBe("Filósofo y naturaleza");
  });

  it("quita negritas y cursivas pero respeta el apóstrofo simple", () => {
    expect(limpiarWiki("'''14 de noviembre''' y ''cursiva'' en O'Keeffe")).toBe(
      "14 de noviembre y cursiva en O'Keeffe",
    );
  });

  it("elimina plantillas, también anidadas", () => {
    expect(limpiarWiki("antes {{a|x}} {{b|{{c}}|y}} después")).toBe("antes después");
  });

  it("elimina referencias, etiquetas HTML y convierte <br> en espacio", () => {
    expect(limpiarWiki('uno<ref name="a"/><ref>nota</ref><br />dos <small>tres</small>')).toBe("uno dos tres");
  });

  it("decodifica entidades HTML básicas y numéricas", () => {
    expect(limpiarWiki("a&nbsp;b &amp; c &#233; &#xE9; &quot;d&quot;")).toBe('a b & c é é "d"');
  });

  it("deja el texto de los enlaces externos y quita los archivos", () => {
    expect(limpiarWiki("[https://ejemplo.org la web] [[Archivo:Foto.jpg|118px|pie]]fin")).toBe("la web fin");
  });

  it("normaliza espacios y saltos de línea", () => {
    expect(limpiarWiki("  uno \n\n  dos\t tres  ")).toBe("uno dos tres");
  });
});

describe("extraerCitaDia", () => {
  it("lee texto, autor, página y descripción, e ignora Imagen=", () => {
    const cita = extraerCitaDia(
      "{{CitaDía|Hola [[mundo|Mundo]]|Autor Uno|Página Uno|[[Filosofía|Filósofo]] (1-2).|Imagen=Foto.jpg}}",
    );
    expect(cita).toEqual({
      texto: "Hola Mundo",
      autor: "Autor Uno",
      pagina: "Página Uno",
      descripcion: "Filósofo (1-2).",
    });
  });

  it("sin página usa el autor y sin descripción no la incluye", () => {
    const cita = extraerCitaDia("{{CitaDía|Un texto|Joseph Joubert|Joseph Joubert}}");
    expect(cita).toEqual({ texto: "Un texto", autor: "Joseph Joubert", pagina: "Joseph Joubert" });
    expect(cita).not.toHaveProperty("descripcion");
    expect(extraerCitaDia("{{CitaDía|Un texto|Alguien}}")?.pagina).toBe("Alguien");
  });

  it("acepta parámetros posicionales con número explícito", () => {
    expect(extraerCitaDia("{{CitaDía|1=Texto|2=Autor}}")).toMatchObject({ texto: "Texto", autor: "Autor" });
  });

  it("devuelve null si no hay plantilla, falta texto o autor, o no cierra", () => {
    expect(extraerCitaDia("El año 2009 no fue bisiesto, por lo que este día no existió.")).toBeNull();
    expect(extraerCitaDia("{{CitaDía|Solo texto}}")).toBeNull();
    expect(extraerCitaDia("{{CitaDía||Autor}}")).toBeNull();
    expect(extraerCitaDia("{{CitaDía|Texto|Autor")).toBeNull();
  });
});

describe("extraerEntradas", () => {
  it("en una clave de año repetida gana la primera y en #default la última (como MediaWiki)", () => {
    const entradas = extraerEntradas(
      "{{#switch: {{{año|{{CURRENTYEAR}} }}}\n| 2011=uno\n| 2011=dos\n| #default=a\n| 2012=tres\n| #default=b\n}}",
    );
    expect(entradas.get("2011")).toBe("uno");
    expect(entradas.get("2012")).toBe("tres");
    expect(entradas.get("#default")).toBe("b");
  });

  it("ignora claves que no son un año ni #default, como #default_old", () => {
    const entradas = extraerEntradas(plantilla("1114"));
    expect([...entradas.keys()]).toEqual(["2011", "2012", "2013", "#default", "2015"]);
  });

  it("sin #switch todo el contenido cuenta como #default", () => {
    const entradas = extraerEntradas("{{CitaDía|Texto|Autor}}");
    expect([...entradas.keys()]).toEqual(["#default"]);
  });

  it("un #switch sin cerrar no produce entradas", () => {
    expect(extraerEntradas("{{#switch: x | 2011=a").size).toBe(0);
  });
});

describe("elegirCita con plantillas reales", () => {
  it("1114: usa la entrada del año si existe", () => {
    const cita = elegirCita(extraerEntradas(plantilla("1114")), 2013);
    expect(cita).toMatchObject({
      texto: expect.stringContaining("la naturaleza no realiza saltos"),
      autor: "Gottfried Leibniz",
      pagina: "Gottfried Wilhelm von Leibniz",
      descripcion: "Filósofo y matemático alemán (1646-1716).",
    });
  });

  it("1114: sin entrada para el año usa la última #default, la misma que muestra Wikiquote", () => {
    const cita = elegirCita(extraerEntradas(plantilla("1114")), 2026);
    expect(cita).toEqual({
      texto: "La que llamamos casualidad no es más que la ignorancia de las causas físicas",
      autor: "Gottfried Leibniz",
      pagina: "Gottfried Leibniz",
      descripcion: "Filósofo y matemático alemán (fallecido el 14 de noviembre de 1716).",
    });
  });

  it("0229: si la entrada del año y #default no son citas, usa el año anterior más reciente con cita", () => {
    const entradas = extraerEntradas(plantilla("0229"));
    expect(elegirCita(entradas, 2026)).toMatchObject({ autor: "Gioachino Rossini" }); // 2020
    expect(elegirCita(entradas, 2009)).toMatchObject({ autor: "Fernando Buesa" }); // 2008
  });

  it("0229: sin ninguna cita anterior ni #default devuelve null", () => {
    expect(elegirCita(extraerEntradas(plantilla("0229")), 2005)).toBeNull();
  });

  it("0315: entrada sin descripción ni imagen", () => {
    const cita = elegirCita(extraerEntradas(plantilla("0315")), 2005);
    expect(cita).toEqual({
      texto: "Unos gustan decir lo que saben; otros lo que piensan",
      autor: "Joseph Joubert",
      pagina: "Joseph Joubert",
    });
  });

  it("0315: descripción con cursivas y comillas, sin rastro del marcado ni de Imagen=", () => {
    const cita = elegirCita(extraerEntradas(plantilla("0315")), 2008);
    expect(cita?.autor).toBe("Georgia O'Keeffe");
    expect(cita?.descripcion).toBe(
      "Original: «I hate flowers. I paint them because they're cheaper than models and they don't move».",
    );
  });

  it("ningún texto devuelto conserva marcado wiki", () => {
    for (const mmdd of ["1114", "0229", "0315"] as const) {
      const entradas = extraerEntradas(plantilla(mmdd));
      for (const anio of [2005, 2008, 2013, 2020, 2026]) {
        const cita = elegirCita(entradas, anio);
        if (!cita) continue;
        for (const campo of [cita.texto, cita.autor, cita.pagina, cita.descripcion ?? ""]) {
          expect(campo).not.toMatch(/\[\[|\]\]|\{\{|\}\}|'{2}|<\w|Imagen=/);
        }
      }
    }
  });
});

describe("enlaceAutor", () => {
  it("cambia espacios por guiones bajos y codifica la URL", () => {
    expect(enlaceAutor("Gottfried Wilhelm von Leibniz")).toBe(
      "https://es.wikiquote.org/wiki/Gottfried_Wilhelm_von_Leibniz",
    );
    expect(enlaceAutor("Pitágoras")).toBe("https://es.wikiquote.org/wiki/Pit%C3%A1goras");
    expect(enlaceAutor("A?b#c")).toBe("https://es.wikiquote.org/wiki/A%3Fb%23c");
  });
});

describe("fechaLocal", () => {
  it("usa el día local con ceros a la izquierda", () => {
    expect(fechaLocal(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(fechaLocal(new Date(2026, 10, 14, 0, 1))).toBe("2026-11-14");
  });
});

describe("crearServicioCita", () => {
  const DIA_14 = new Date(2026, 10, 14, 10, 0);
  const DIA_15 = new Date(2026, 10, 15, 0, 5);
  const MIN = 60_000;

  function respuestaWiki(wikitext: string, init?: ResponseInit): Response {
    const cuerpo = { query: { pages: [{ revisions: [{ slots: { main: { content: wikitext } } }] }] } };
    return new Response(JSON.stringify(cuerpo), { status: 200, ...init });
  }

  /** `fetch` simulado y reloj controlable. */
  function montar(responder: (url: string) => Promise<Response> | Response) {
    const llamadas: { url: string; init?: RequestInit }[] = [];
    const fetchSimulado = vi.fn(async (entrada: string | URL | Request, init?: RequestInit) => {
      const url = String(entrada);
      llamadas.push({ url, init });
      return responder(url);
    });
    let reloj = DIA_14;
    const servicio = crearServicioCita({
      fetch: fetchSimulado as unknown as typeof fetch,
      ahora: () => reloj,
    });
    return {
      servicio,
      llamadas,
      fetchSimulado,
      fijarReloj: (d: Date) => {
        reloj = d;
      },
    };
  }

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function silenciarAvisos() {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  }

  it("pide la plantilla del día con el User-Agent propio y devuelve la cita con atribución", async () => {
    const { servicio, llamadas } = montar(() => respuestaWiki(plantilla("1114")));
    const cita = await servicio.obtener();
    expect(cita).toEqual({
      texto: "La que llamamos casualidad no es más que la ignorancia de las causas físicas",
      autor: "Gottfried Leibniz",
      descripcion: "Filósofo y matemático alemán (fallecido el 14 de noviembre de 1716).",
      fecha: "2026-11-14",
      enlace: "https://es.wikiquote.org/wiki/Gottfried_Leibniz",
      atribucion: {
        fuente: "Wikiquote",
        licencia: "CC BY-SA 4.0",
        licenciaUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.es",
      },
    });
    expect(llamadas).toHaveLength(1);
    const url = new URL(llamadas[0].url);
    expect(url.origin + url.pathname).toBe("https://es.wikiquote.org/w/api.php");
    expect(url.searchParams.get("titles")).toBe("Plantilla:1114");
    expect(llamadas[0].init?.headers).toMatchObject({ "User-Agent": "TolochaHome/cita" });
  });

  it("varias consultas el mismo día hacen una sola petición", async () => {
    const { servicio, fetchSimulado } = montar(() => respuestaWiki(plantilla("1114")));
    const a = await servicio.obtener();
    const b = await servicio.obtener();
    const c = await servicio.obtener();
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("peticiones simultáneas comparten una única descarga", async () => {
    const { servicio, fetchSimulado } = montar(() => respuestaWiki(plantilla("1114")));
    const [a, b, c] = await Promise.all([servicio.obtener(), servicio.obtener(), servicio.obtener()]);
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    expect(a).not.toBeNull();
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it("al cambiar de día pide la plantilla nueva", async () => {
    const { servicio, llamadas, fijarReloj } = montar((url) =>
      respuestaWiki(plantilla(url.includes("1115") ? "0315" : "1114")),
    );
    await servicio.obtener();
    fijarReloj(DIA_15);
    const nueva = await servicio.obtener();
    expect(llamadas).toHaveLength(2);
    expect(new URL(llamadas[1].url).searchParams.get("titles")).toBe("Plantilla:1115");
    expect(nueva).toMatchObject({ fecha: "2026-11-15", autor: "Ruth Bader Ginsburg" });
  });

  it("si la fuente falla sirve la última cita guardada con su fecha original", async () => {
    silenciarAvisos();
    let fallar = false;
    const { servicio, fijarReloj } = montar(() => {
      if (fallar) throw new Error("red caída");
      return respuestaWiki(plantilla("1114"));
    });
    await servicio.obtener();
    fallar = true;
    fijarReloj(DIA_15);
    const cita = await servicio.obtener();
    expect(cita).toMatchObject({ fecha: "2026-11-14", autor: "Gottfried Leibniz" });
  });

  it("tras un fallo no reintenta durante 10 minutos y luego vuelve a intentarlo", async () => {
    silenciarAvisos();
    const { servicio, fetchSimulado, fijarReloj } = montar(() => {
      throw new Error("red caída");
    });
    expect(await servicio.obtener()).toBeNull();
    expect(fetchSimulado).toHaveBeenCalledTimes(1);

    fijarReloj(new Date(DIA_14.getTime() + 5 * MIN));
    expect(await servicio.obtener()).toBeNull();
    expect(fetchSimulado).toHaveBeenCalledTimes(1);

    fijarReloj(new Date(DIA_14.getTime() + 10 * MIN + 1));
    expect(await servicio.obtener()).toBeNull();
    expect(fetchSimulado).toHaveBeenCalledTimes(2);
  });

  it("se recupera cuando la fuente vuelve", async () => {
    silenciarAvisos();
    let fallar = true;
    const { servicio, fijarReloj } = montar(() => {
      if (fallar) throw new Error("red caída");
      return respuestaWiki(plantilla("1114"));
    });
    expect(await servicio.obtener()).toBeNull();
    fallar = false;
    fijarReloj(new Date(DIA_14.getTime() + 11 * MIN));
    expect(await servicio.obtener()).toMatchObject({ autor: "Gottfried Leibniz" });
  });

  it("trata como fallo un estado HTTP de error", async () => {
    silenciarAvisos();
    const { servicio } = montar(() => new Response("error", { status: 500 }));
    expect(await servicio.obtener()).toBeNull();
  });

  it("trata como fallo una plantilla inexistente", async () => {
    silenciarAvisos();
    const { servicio } = montar(
      () => new Response(JSON.stringify({ query: { pages: [{ missing: true }] } }), { status: 200 }),
    );
    expect(await servicio.obtener()).toBeNull();
  });

  it("trata como fallo una plantilla sin ninguna cita reconocible", async () => {
    silenciarAvisos();
    const { servicio } = montar(() => respuestaWiki("{{#switch: x | 2011=El año no existió | #default=nada }}"));
    expect(await servicio.obtener()).toBeNull();
  });

  it("trata como fallo una respuesta que no es JSON", async () => {
    silenciarAvisos();
    const { servicio } = montar(() => new Response("<html>Wikimedia Error</html>", { status: 200 }));
    expect(await servicio.obtener()).toBeNull();
  });

  it("rechaza una respuesta de más de 256 KB", async () => {
    silenciarAvisos();
    const { servicio } = montar(() => respuestaWiki("x".repeat(300 * 1024)));
    expect(await servicio.obtener()).toBeNull();
  });

  it("corta la descarga a los 8 s", async () => {
    silenciarAvisos();
    vi.useFakeTimers();
    const colgado = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, rechazar) => {
        init?.signal?.addEventListener("abort", () => rechazar(new Error("abortado")));
      })) as unknown as typeof fetch;
    const servicio = crearServicioCita({ fetch: colgado, ahora: () => DIA_14 });
    const pendiente = servicio.obtener();
    await vi.advanceTimersByTimeAsync(8000);
    expect(await pendiente).toBeNull();
  });
});
