import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { createTestApp, registrar, type TestContext } from "./helpers.js";
import { feeds } from "../src/db/schema.js";

let ctx: TestContext | undefined;
let base = "";
let servidor: Server | undefined;
let peticionesRss = 0;
let peticiones304 = 0;
let fallarRss = false;

function item(i: number): string {
  const fecha = new Date(Date.UTC(2026, 10, 4, 10, 0, 0) - i * 60_000).toUTCString();
  return `<item><title>Noticia ${i}</title><link>/n/${i}</link><description><![CDATA[<p>Resumen <b>${i}</b></p>]]></description><pubDate>${fecha}</pubDate></item>`;
}

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Feed de prueba</title>
    <link>https://example.com</link>
    ${Array.from({ length: 35 }, (_, i) => item(i)).join("")}
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
  <channel><title>RDF de prueba</title><link>https://example.com</link></channel>
  <item><title>Entrada RDF</title><link>https://example.com/rdf/1</link></item>
</rdf:RDF>`;

const RSS_CORTO = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Feed 304</title><link>https://example.com</link>
<item><title>Entrada 304</title><link>https://example.com/304</link></item>
</channel></rss>`;

const LATIN1 = `<?xml version="1.0" encoding="ISO-8859-1"?>
<rss version="2.0"><channel><title>Noticias con acentos</title><link>https://example.com</link>
<item><title>Información</title><link>https://example.com/informacion</link></item>
</channel></rss>`;

function enviar(
  res: import("node:http").ServerResponse,
  status: number,
  cuerpo: string | Buffer,
  headers: Record<string, string> = {},
): void {
  res.writeHead(status, headers);
  res.end(cuerpo);
}

beforeAll(
  () =>
    new Promise<void>((fin) => {
      servidor = createServer((req, res) => {
        const url = req.url ?? "/";

        if (url === "/rss.xml") {
          peticionesRss += 1;
          if (fallarRss) {
            enviar(res, 500, "error");
            return;
          }
          enviar(res, 200, RSS, {
            "Content-Type": "application/rss+xml; charset=utf-8",
          });
          return;
        }
        if (url === "/atom.xml") {
          enviar(res, 200, ATOM, { "Content-Type": "application/atom+xml" });
          return;
        }
        if (url === "/rdf.xml") {
          enviar(res, 200, RDF, { "Content-Type": "application/rdf+xml" });
          return;
        }
        if (url === "/latin1.xml") {
          enviar(res, 200, Buffer.from(LATIN1, "latin1"), {
            "Content-Type": "application/rss+xml; charset=ISO-8859-1",
          });
          return;
        }
        if (url === "/304.xml") {
          peticiones304 += 1;
          if (req.headers["if-none-match"] === '"v1"') {
            enviar(res, 304, "", { ETag: '"v1"' });
            return;
          }
          enviar(res, 200, RSS_CORTO, {
            "Content-Type": "application/rss+xml",
            ETag: '"v1"',
          });
          return;
        }
        if (url === "/html-feed") {
          enviar(
            res,
            200,
            '<html><head><link rel="alternate" type="application/rss+xml" href="/rss.xml"></head></html>',
            { "Content-Type": "text/html; charset=utf-8" },
          );
          return;
        }
        if (url === "/blog/index.html") {
          enviar(
            res,
            200,
            '<html><head><link rel="alternate" type="application/atom+xml" href="atom.xml"></head></html>',
            { "Content-Type": "text/html; charset=utf-8" },
          );
          return;
        }
        if (url === "/blog/atom.xml") {
          enviar(res, 200, ATOM, { "Content-Type": "application/atom+xml" });
          return;
        }
        if (url === "/html-no-feed") {
          enviar(res, 200, "<html><head><title>Sin feed</title></head></html>", {
            "Content-Type": "text/html; charset=utf-8",
          });
          return;
        }
        if (url === "/invalido.xml") {
          enviar(res, 200, "<rss><channel>", { "Content-Type": "application/xml" });
          return;
        }
        if (url === "/doctype.xml") {
          enviar(
            res,
            200,
            '<!DOCTYPE rss [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><rss><channel><title>X</title></channel></rss>',
            { "Content-Type": "application/xml" },
          );
          return;
        }

        enviar(res, 404, "No encontrado");
      }).listen(0, "127.0.0.1", () => {
        const direccion = servidor!.address();
        base = typeof direccion === "object" && direccion ? `http://127.0.0.1:${direccion.port}` : "";
        fin();
      });
    }),
);

afterAll(
  () =>
    new Promise<void>((fin) => {
      servidor?.close(() => fin());
    }),
);

beforeEach(() => {
  ctx = createTestApp({ FEEDS_ALLOW_PRIVATE: "true" });
  peticionesRss = 0;
  peticiones304 = 0;
  fallarRss = false;
});

afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
});

function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

describe("GET /api/v1/feeds", () => {
  it("sin sesión responde 401", async () => {
    const res = await request(ctx!.app).get("/api/v1/feeds");
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("NO_AUTORIZADO");
  });

  it("empieza vacío, con intervalo de 30 minutos", async () => {
    const token = await registrar(ctx!.app, "vacio@ejemplo.com");
    const res = await request(ctx!.app).get("/api/v1/feeds").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.feeds).toEqual([]);
    expect(res.body.ajustes).toEqual({ intervaloMin: 30 });
  });
});

describe("POST /api/v1/feeds", () => {
  it("crea un feed directo, guarda 30 entradas y detecta título", async () => {
    const token = await registrar(ctx!.app, "alta@ejemplo.com");
    const res = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/rss.xml` });
    expect(res.status).toBe(201);
    expect(res.body.feed).toMatchObject({
      titulo: "Feed de prueba",
      sitioUrl: "https://example.com/",
      orden: 0,
      error: null,
    });
    expect(res.body.feed.entradas).toHaveLength(30);
    expect(res.body.feed.entradas[0].titulo).toBe("Noticia 0");
    expect(res.body.feed.entradas[0].resumen).toBe("Resumen 0");
    expect(res.body.feed.url).toBe(`${base}/rss.xml`);
  });

  it("autodescubre el feed de una URL de sitio", async () => {
    const token = await registrar(ctx!.app, "sitio@ejemplo.com");
    const res = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/html-feed` });
    expect(res.status).toBe(201);
    expect(res.body.feed.url).toBe(`${base}/rss.xml`);
    expect(res.body.feed.entradas).toHaveLength(30);
  });

  it("autodescubre un alternate relativo", async () => {
    const token = await registrar(ctx!.app, "relativo@ejemplo.com");
    const res = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/blog/index.html` });
    expect(res.status).toBe(201);
    expect(res.body.feed.url).toBe(`${base}/blog/atom.xml`);
    expect(res.body.feed.titulo).toBe("Atom de prueba");
  });

  it("rechaza HTML sin feed sin guardar nada", async () => {
    const token = await registrar(ctx!.app, "sinfeed@ejemplo.com");
    const res = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/html-no-feed` });
    expect(res.status).toBe(400);
    expect(res.body.error.mensaje).toContain("No se ha encontrado un feed");
    const lista = await request(ctx!.app).get("/api/v1/feeds").set(auth(token));
    expect(lista.body.feeds).toHaveLength(0);
  });

  it("rechaza XML inválido y DOCTYPE sin guardar", async () => {
    const token = await registrar(ctx!.app, "invalido@ejemplo.com");
    const invalido = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/invalido.xml` });
    expect(invalido.status).toBe(400);
    expect(invalido.body.error.codigo).toBe("FEED_INVALIDO");

    const doctype = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/doctype.xml` });
    expect(doctype.status).toBe(400);
    expect(doctype.body.error.mensaje).toContain("declaración XML no permitida");

    const lista = await request(ctx!.app).get("/api/v1/feeds").set(auth(token));
    expect(lista.body.feeds).toHaveLength(0);
  });

  it("rechaza duplicados con 409", async () => {
    const token = await registrar(ctx!.app, "duplicado@ejemplo.com");
    const primera = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/rss.xml` });
    expect(primera.status).toBe(201);
    const segunda = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/rss.xml` });
    expect(segunda.status).toBe(409);
    expect(segunda.body.error.codigo).toBe("FEED_DUPLICADO");
  });

  it("rechaza URLs no válidas con 400", async () => {
    const token = await registrar(ctx!.app, "url@ejemplo.com");
    const res = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: "javascript:alert(1)" });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("FEED_INVALIDO");
  });

  it("limita a 50 feeds por usuario", async () => {
    const token = await registrar(ctx!.app, "limite@ejemplo.com");
    const primero = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/rss.xml` });
    expect(primero.status).toBe(201);
    const userId = primero.body.feed.id
      ? ctx!.db.select().from(feeds).get()!.userId
      : "";
    const ahora = Date.now();
    const relleno = Array.from({ length: 49 }, (_, i) => ({
      id: randomUUID(),
      userId,
      url: `https://example.com/feed-${i}.xml`,
      titulo: `Feed ${i}`,
      sitioUrl: null,
      orden: i + 1,
      actualizadoEn: ahora,
      ultimoIntentoEn: ahora,
      error: null,
      etag: null,
      lastModified: null,
      entradas: [],
    }));
    ctx!.db.insert(feeds).values(relleno).run();

    const extra = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/rss.xml?extra` });
    expect(extra.status).toBe(400);
    expect(extra.body.error.codigo).toBe("DEMASIADOS_FEEDS");
  });
});

describe("aislamiento y baja", () => {
  it("cada usuario solo ve sus feeds y no puede borrar los ajenos", async () => {
    const tokenA = await registrar(ctx!.app, "a@ejemplo.com");
    const tokenB = await registrar(ctx!.app, "b@ejemplo.com");
    const creado = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(tokenA))
      .send({ url: `${base}/rss.xml` });
    expect(creado.status).toBe(201);

    const listaB = await request(ctx!.app).get("/api/v1/feeds").set(auth(tokenB));
    expect(listaB.body.feeds).toHaveLength(0);

    const borrarB = await request(ctx!.app)
      .delete(`/api/v1/feeds/${creado.body.feed.id}`)
      .set(auth(tokenB));
    expect(borrarB.status).toBe(404);
    expect(borrarB.body.error.codigo).toBe("FEED_NO_ENCONTRADO");
  });

  it("borra una suscripción propia", async () => {
    const token = await registrar(ctx!.app, "borrar@ejemplo.com");
    const creado = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/rss.xml` });
    const borrado = await request(ctx!.app)
      .delete(`/api/v1/feeds/${creado.body.feed.id}`)
      .set(auth(token));
    expect(borrado.status).toBe(200);
    expect(borrado.body).toEqual({ ok: true });
    const lista = await request(ctx!.app).get("/api/v1/feeds").set(auth(token));
    expect(lista.body.feeds).toHaveLength(0);
  });
});

describe("ajustes de actualización", () => {
  it("guarda el intervalo y valida el rango", async () => {
    const token = await registrar(ctx!.app, "ajustes@ejemplo.com");
    const ok = await request(ctx!.app)
      .put("/api/v1/feeds/ajustes")
      .set(auth(token))
      .send({ intervaloMin: 15 });
    expect(ok.status).toBe(200);
    expect(ok.body.ajustes).toEqual({ intervaloMin: 15 });

    const bajo = await request(ctx!.app)
      .put("/api/v1/feeds/ajustes")
      .set(auth(token))
      .send({ intervaloMin: 14 });
    expect(bajo.status).toBe(400);

    const alto = await request(ctx!.app)
      .put("/api/v1/feeds/ajustes")
      .set(auth(token))
      .send({ intervaloMin: 721 });
    expect(alto.status).toBe(400);

    const lista = await request(ctx!.app).get("/api/v1/feeds").set(auth(token));
    expect(lista.body.ajustes).toEqual({ intervaloMin: 15 });
  });
});

describe("refresco", () => {
  it("usa la caché si el feed es reciente y refresca si está viejo", async () => {
    const token = await registrar(ctx!.app, "refresco@ejemplo.com");
    const creado = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/rss.xml` });
    const id = creado.body.feed.id as string;
    const antes = peticionesRss;

    const reciente = await request(ctx!.app).get("/api/v1/feeds").set(auth(token));
    expect(reciente.status).toBe(200);
    expect(peticionesRss).toBe(antes);

    await request(ctx!.app)
      .put("/api/v1/feeds/ajustes")
      .set(auth(token))
      .send({ intervaloMin: 15 });
    ctx!.db
      .update(feeds)
      .set({ actualizadoEn: Date.now() - 16 * 60_000 })
      .where(eq(feeds.id, id))
      .run();

    const viejo = await request(ctx!.app).get("/api/v1/feeds").set(auth(token));
    expect(viejo.status).toBe(200);
    expect(peticionesRss).toBe(antes + 1);
    expect(viejo.body.feeds[0].entradas).toHaveLength(30);
  });

  it("no refresca con ?resumen=1", async () => {
    const token = await registrar(ctx!.app, "resumen@ejemplo.com");
    const creado = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/rss.xml` });
    const id = creado.body.feed.id as string;
    ctx!.db
      .update(feeds)
      .set({ actualizadoEn: Date.now() - 60 * 60_000 })
      .where(eq(feeds.id, id))
      .run();
    const antes = peticionesRss;

    const resumen = await request(ctx!.app)
      .get("/api/v1/feeds?resumen=1")
      .set(auth(token));
    expect(resumen.status).toBe(200);
    expect(peticionesRss).toBe(antes);
    expect(resumen.body.feeds[0]).not.toHaveProperty("entradas");
  });

  it("mantiene las entradas ante un 304", async () => {
    const token = await registrar(ctx!.app, "304@ejemplo.com");
    const creado = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/304.xml` });
    const id = creado.body.feed.id as string;
    expect(creado.body.feed.entradas).toHaveLength(1);
    ctx!.db
      .update(feeds)
      .set({ actualizadoEn: Date.now() - 60 * 60_000 })
      .where(eq(feeds.id, id))
      .run();
    peticiones304 = 0;

    const res = await request(ctx!.app).get("/api/v1/feeds").set(auth(token));
    expect(res.status).toBe(200);
    expect(peticiones304).toBe(1);
    expect(res.body.feeds[0].entradas).toHaveLength(1);
    expect(res.body.feeds[0].error).toBeNull();
  });

  it("conserva la última copia si el feed falla", async () => {
    const token = await registrar(ctx!.app, "fallo@ejemplo.com");
    const creado = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/rss.xml` });
    const id = creado.body.feed.id as string;
    fallarRss = true;
    ctx!.db
      .update(feeds)
      .set({ actualizadoEn: Date.now() - 60 * 60_000 })
      .where(eq(feeds.id, id))
      .run();

    const res = await request(ctx!.app).get("/api/v1/feeds").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.feeds[0].error).toContain("500");
    expect(res.body.feeds[0].entradas).toHaveLength(30);
  });

  it("fuerza el refresco con POST /refrescar", async () => {
    const token = await registrar(ctx!.app, "forzar@ejemplo.com");
    await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/rss.xml` });
    peticionesRss = 0;

    const res = await request(ctx!.app)
      .post("/api/v1/feeds/refrescar")
      .set(auth(token));
    expect(res.status).toBe(200);
    expect(peticionesRss).toBe(1);
    expect(res.body.feeds[0].entradas).toHaveLength(30);
  });
});

describe("formatos y codificación", () => {
  it("parsea Atom y RDF", async () => {
    const token = await registrar(ctx!.app, "formatos@ejemplo.com");
    const atom = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/atom.xml` });
    expect(atom.status).toBe(201);
    expect(atom.body.feed.titulo).toBe("Atom de prueba");

    const rdf = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/rdf.xml` });
    expect(rdf.status).toBe(201);
    expect(rdf.body.feed.titulo).toBe("RDF de prueba");
    expect(rdf.body.feed.entradas[0].titulo).toBe("Entrada RDF");
  });

  it("decodifica ISO-8859-1", async () => {
    const token = await registrar(ctx!.app, "latin1@ejemplo.com");
    const res = await request(ctx!.app)
      .post("/api/v1/feeds")
      .set(auth(token))
      .send({ url: `${base}/latin1.xml` });
    expect(res.status).toBe(201);
    expect(res.body.feed.titulo).toBe("Noticias con acentos");
    expect(res.body.feed.entradas[0].titulo).toBe("Información");
  });
});
