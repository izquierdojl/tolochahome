import { describe, expect, it } from "vitest";
import {
  autodescubrirFeed,
  descargarFeed,
  htmlATexto,
  normalizarUrlFeed,
  obtenerFeed,
  parsearFeed,
} from "../src/lib/feeds.js";

type EntradaFetch = Parameters<typeof fetch>[0];
type InitFetch = Parameters<typeof fetch>[1];

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Mi feed</title>
    <link>https://example.com</link>
    <item>
      <title>Noticia &amp; más</title>
      <link>/noticia/1</link>
      <description><![CDATA[<p>Hola <b>mundo</b> &amp; compañía</p>]]></description>
      <pubDate>Wed, 04 Nov 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Otra noticia</title>
      <link>https://example.com/noticia/2</link>
      <description>Texto plano</description>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom de prueba</title>
  <link rel="alternate" type="text/html" href="https://example.com" />
  <entry>
    <title>Entrada Atom</title>
    <link rel="alternate" type="text/html" href="/a/1" />
    <summary>Resumen Atom</summary>
    <updated>2026-11-04T10:00:00Z</updated>
  </entry>
</feed>`;

const RDF = `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/">
  <channel>
    <title>RDF de prueba</title>
    <link>https://example.com</link>
  </channel>
  <item>
    <title>Entrada RDF</title>
    <link>https://example.com/rdf/1</link>
  </item>
</rdf:RDF>`;

function xmlConItems(cantidad: number): string {
  const items = Array.from({ length: cantidad }, (_, i) => {
    const fecha = new Date(Date.UTC(2026, 10, 4, 10, 0, 0) - i * 60_000).toUTCString();
    return `<item><title>Noticia ${i}</title><link>https://example.com/n/${i}</link><pubDate>${fecha}</pubDate></item>`;
  }).join("");
  return `<rss version="2.0"><channel><title>Muchas</title><link>https://example.com</link>${items}</channel></rss>`;
}

function fetchConCuerpo(cuerpo: string | Uint8Array, contentType: string): typeof fetch {
  return (async () =>
    new Response(cuerpo, {
      status: 200,
      headers: { "content-type": contentType },
    })) as typeof fetch;
}

describe("normalizarUrlFeed", () => {
  it("antepone https y normaliza feed://", () => {
    expect(normalizarUrlFeed("feeds.example.com/rss")).toBe("https://feeds.example.com/rss");
    expect(normalizarUrlFeed("feed://feeds.example.com/rss")).toBe(
      "https://feeds.example.com/rss",
    );
  });

  it("rechaza esquemas no web y URLs vacías", () => {
    expect(() => normalizarUrlFeed("ftp://example.com/feed")).toThrow("http o https");
    expect(() => normalizarUrlFeed("javascript:alert(1)")).toThrow("http o https");
    expect(() => normalizarUrlFeed("   ")).toThrow("Introduce una URL");
  });

  it("elimina el fragmento", () => {
    expect(normalizarUrlFeed("https://example.com/feed#seccion")).toBe(
      "https://example.com/feed",
    );
  });
});

describe("parsearFeed", () => {
  it("parsea RSS 2.0, resuelve enlaces relativos y limpia el HTML", () => {
    const feed = parsearFeed(RSS, "https://example.com/rss.xml");
    expect(feed.titulo).toBe("Mi feed");
    expect(feed.sitioUrl).toBe("https://example.com/");
    expect(feed.entradas).toHaveLength(2);
    expect(feed.entradas[0]).toMatchObject({
      titulo: "Noticia & más",
      enlace: "https://example.com/noticia/1",
      resumen: "Hola mundo & compañía",
    });
    expect(feed.entradas[0].publicadoEn).toBe(Date.parse("Wed, 04 Nov 2026 10:00:00 GMT"));
  });

  it("parsea Atom y resuelve sus enlaces", () => {
    const feed = parsearFeed(ATOM, "https://example.com/atom.xml");
    expect(feed.titulo).toBe("Atom de prueba");
    expect(feed.sitioUrl).toBe("https://example.com/");
    expect(feed.entradas[0]).toMatchObject({
      titulo: "Entrada Atom",
      enlace: "https://example.com/a/1",
      resumen: "Resumen Atom",
    });
  });

  it("parsea RSS 1.0/RDF", () => {
    const feed = parsearFeed(RDF, "https://example.com/rdf.xml");
    expect(feed.titulo).toBe("RDF de prueba");
    expect(feed.entradas[0]).toMatchObject({
      titulo: "Entrada RDF",
      enlace: "https://example.com/rdf/1",
    });
  });

  it("conserva como máximo 30 entradas, las más recientes", () => {
    const feed = parsearFeed(xmlConItems(35), "https://example.com/rss.xml");
    expect(feed.entradas).toHaveLength(30);
    expect(feed.entradas[0].titulo).toBe("Noticia 0");
    expect(feed.entradas[29].titulo).toBe("Noticia 29");
  });

  it("descarta entradas sin enlace válido o con esquema no web", () => {
    const xml = `<rss version="2.0"><channel><title>X</title><link>https://example.com</link>
      <item><title>Buena</title><link>https://example.com/buena</link></item>
      <item><title>Mala</title><link>javascript:alert(1)</link></item>
      </channel></rss>`;
    const feed = parsearFeed(xml, "https://example.com/rss.xml");
    expect(feed.entradas.map((e) => e.titulo)).toEqual(["Buena"]);
  });

  it("rechaza XML mal formado, DOCTYPE y ENTITY", () => {
    expect(() => parsearFeed("<rss><channel>", "https://example.com")).toThrow();
    expect(() =>
      parsearFeed("<!DOCTYPE rss [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]><rss/>", "https://example.com"),
    ).toThrow("declaración XML no permitida");
    expect(() =>
      parsearFeed("<!DOCTYPE rss [<!ENTITY x 'x'>]><rss><channel/></rss>", "https://example.com"),
    ).toThrow("declaración XML no permitida");
  });
});

describe("htmlATexto", () => {
  it("elimina etiquetas, scripts y decodifica entidades", () => {
    expect(htmlATexto("<p>Hola <b>mundo</b> &amp; más</p>")).toBe("Hola mundo & más");
    expect(htmlATexto("<script>alert(1)</script><p>Texto</p>")).toBe("Texto");
    expect(htmlATexto("<![CDATA[<p>Dentro</p>]]>")).toBe("Dentro");
    expect(htmlATexto("Noticias&nbsp;de&hellip;")).toBe("Noticias de…");
    expect(htmlATexto("Noticias&rsquo; de hoy")).toBe("Noticias’ de hoy");
  });
});

describe("autodescubrirFeed", () => {
  it("encuentra un alternate absoluto o relativo", () => {
    const html = `<html><head><link rel="alternate" type="application/rss+xml" href="/rss.xml"></head></html>`;
    expect(autodescubrirFeed(html, "https://example.com/sitio")).toBe(
      "https://example.com/rss.xml",
    );
    const relativo = `<link href="feed.xml" type="application/atom+xml" rel="alternate">`;
    expect(autodescubrirFeed(relativo, "https://example.com/blog/index.html")).toBe(
      "https://example.com/blog/feed.xml",
    );
  });

  it("devuelve null si no hay alternate RSS/Atom", () => {
    expect(autodescubrirFeed("<html><head><title>Sin feed</title></head></html>", "https://example.com")).toBeNull();
    expect(
      autodescubrirFeed('<link rel="stylesheet" type="text/css" href="/estilo.css">', "https://example.com"),
    ).toBeNull();
  });
});

describe("descarga y seguridad", () => {
  it("rechaza hosts privados sin FEEDS_ALLOW_PRIVATE", async () => {
    await expect(descargarFeed("http://127.0.0.1:9/feed")).rejects.toThrow(
      "No se puede acceder a esa dirección",
    );
  });

  it("rechaza una redirección a un host privado", async () => {
    let llamadas = 0;
    const fetchFalso = (async () => {
      llamadas += 1;
      return new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/feed.xml" },
      });
    }) as typeof fetch;

    await expect(
      descargarFeed("https://publico.example/feed", {
        fetchImpl: fetchFalso,
        validarHost: async (host) => host !== "127.0.0.1",
      }),
    ).rejects.toThrow("No se puede acceder a esa dirección");
    expect(llamadas).toBe(1);
  });

  it("aborta por timeout", async () => {
    const fetchFalso = ((_entrada: EntradaFetch, init?: InitFetch) =>
      new Promise<Response>((_resolver, rechazar) => {
        init?.signal?.addEventListener("abort", () => {
          rechazar(new DOMException("Aborted", "AbortError"));
        });
      })) as typeof fetch;

    await expect(
      descargarFeed("https://publico.example/feed", {
        fetchImpl: fetchFalso,
        validarHost: async () => true,
        timeoutMs: 20,
      }),
    ).rejects.toThrow("tardado demasiado");
  });

  it("aborta si la respuesta supera el tope", async () => {
    const fetchFalso = fetchConCuerpo("x".repeat(200), "application/xml");
    await expect(
      descargarFeed("https://publico.example/feed", {
        fetchImpl: fetchFalso,
        validarHost: async () => true,
        maxBytes: 50,
      }),
    ).rejects.toThrow("demasiado grande");
  });

  it("parsea una respuesta ISO-8859-1 usando el charset HTTP", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Noticias con acentos</title><link>https://example.com</link><item><title>Información</title><link>https://example.com/1</link></item></channel></rss>`;
    const bytes = Uint8Array.from(Buffer.from(xml, "latin1"));
    const resultado = await obtenerFeed("https://example.com/feed", {
      fetchImpl: fetchConCuerpo(bytes, "application/rss+xml; charset=ISO-8859-1"),
      validarHost: async () => true,
    });
    expect(resultado.titulo).toBe("Noticias con acentos");
    expect(resultado.entradas[0].titulo).toBe("Información");
  });

  it("usa la declaración XML cuando no hay charset HTTP", async () => {
    const xml = `<?xml version="1.0" encoding="ISO-8859-1"?><rss version="2.0"><channel><title>Añoranza</title><link>https://example.com</link></channel></rss>`;
    const bytes = Uint8Array.from(Buffer.from(xml, "latin1"));
    const resultado = await obtenerFeed("https://example.com/feed", {
      fetchImpl: fetchConCuerpo(bytes, "application/xml"),
      validarHost: async () => true,
    });
    expect(resultado.titulo).toBe("Añoranza");
  });

  it("autodescubre el feed de una página HTML", async () => {
    const fetchFalso = (async (entrada: EntradaFetch) => {
      const url = String(entrada);
      if (url.endsWith("/sitio")) {
        return new Response(
          '<html><head><link rel="alternate" type="application/rss+xml" href="/rss.xml"></head></html>',
          { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
        );
      }
      if (url.endsWith("/rss.xml")) {
        return new Response(RSS, {
          status: 200,
          headers: { "content-type": "application/rss+xml" },
        });
      }
      return new Response("No", { status: 404 });
    }) as typeof fetch;

    const resultado = await obtenerFeed("https://example.com/sitio", {
      fetchImpl: fetchFalso,
      validarHost: async () => true,
    });
    expect(resultado.urlFeed).toBe("https://example.com/rss.xml");
    expect(resultado.titulo).toBe("Mi feed");
    expect(resultado.entradas).toHaveLength(2);
  });

  it("falla si la página HTML no tiene feed", async () => {
    await expect(
      obtenerFeed("https://example.com/sitio", {
        fetchImpl: fetchConCuerpo("<html><head><title>Sin feed</title></head></html>", "text/html"),
        validarHost: async () => true,
      }),
    ).rejects.toThrow("No se ha encontrado un feed");
  });
});
