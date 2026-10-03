import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, registrar, type TestContext } from "./helpers.js";

let ctx: TestContext | undefined;
afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
});

const HTML = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Marcadores</TITLE>
<H1>Marcadores</H1>
<DL><p>
    <DT><H3>Lecturas</H3>
    <DL><p>
        <DT><A HREF="https://ejemplo.com/uno">Uno</A>
        <DT><A HREF="javascript:mal()">Malo</A>
        <DT><A HREF="https://ejemplo.com/uno">Uno repetido</A>
    </DL><p>
    <DT><H3>Musica</H3>
    <DL><p>
        <DT><A HREF="https://musica.com/">Música</A>
    </DL><p>
</DL><p>`;

describe("POST /api/v1/import", () => {
  it("importa carpetas y enlaces con resumen", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "im@ejemplo.com");
    const res = await request(ctx.app)
      .post("/api/v1/import")
      .set("Authorization", `Bearer ${token}`)
      .attach("fichero", Buffer.from(HTML, "utf8"), { filename: "marcadores.html", contentType: "text/html" });
    expect(res.status).toBe(200);
    expect(res.body.creados).toEqual({ grupos: 2, favoritos: 2 });
    expect(res.body.omitidos).toEqual([
      { grupo: "Lecturas", titulo: "Malo", motivo: "url-no-valida" },
      { grupo: "Lecturas", titulo: "Uno repetido", motivo: "duplicado" },
    ]);

    const grupos = await request(ctx.app).get("/api/v1/groups").set("Authorization", `Bearer ${token}`);
    expect(grupos.body.grupos.map((g: { nombre: string }) => g.nombre).sort()).toEqual(["Lecturas", "Musica"]);
  });

  it("importa JSON propio", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "im@ejemplo.com");
    const cuerpo = JSON.stringify({
      version: 1,
      grupos: [{ nombre: "J", color: "#112233", favoritos: [{ titulo: "T", url: "https://t.com" }] }],
    });
    const res = await request(ctx.app)
      .post("/api/v1/import")
      .set("Authorization", `Bearer ${token}`)
      .attach("fichero", Buffer.from(cuerpo), { filename: "m.json", contentType: "application/json" });
    expect(res.status).toBe(200);
    expect(res.body.creados).toEqual({ grupos: 1, favoritos: 1 });
    const grupos = await request(ctx.app).get("/api/v1/groups").set("Authorization", `Bearer ${token}`);
    expect(grupos.body.grupos[0]).toMatchObject({ nombre: "J", color: "#112233", favoritos: 1 });
  });

  it("fichero irreconocible responde 400 sin crear nada", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "im@ejemplo.com");
    const res = await request(ctx.app)
      .post("/api/v1/import")
      .set("Authorization", `Bearer ${token}`)
      .attach("fichero", Buffer.from("hola mundo"), { filename: "x.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
    const grupos = await request(ctx.app).get("/api/v1/groups").set("Authorization", `Bearer ${token}`);
    expect(grupos.body.grupos).toHaveLength(0);
  });

  it("sin sesión responde 401", async () => {
    ctx = createTestApp();
    const res = await request(ctx.app)
      .post("/api/v1/import")
      .attach("fichero", Buffer.from(HTML), { filename: "m.html", contentType: "text/html" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/export", () => {
  it("exporta html y json con todo lo propio", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "ex@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    const grupo = await request(ctx.app).post("/api/v1/groups").set(auth).send({ nombre: "G" });
    await request(ctx.app).post("/api/v1/bookmarks").set(auth).send({
      groupId: grupo.body.grupo.id,
      titulo: "T",
      url: "https://t.com",
    });

    const html = await request(ctx.app).get("/api/v1/export?formato=html").set(auth);
    expect(html.status).toBe(200);
    expect(html.headers["content-disposition"]).toContain("attachment");
    expect(html.text).toContain("NETSCAPE-Bookmark");
    expect(html.text).toContain("https://t.com");

    const json = await request(ctx.app).get("/api/v1/export?formato=json").set(auth);
    expect(json.status).toBe(200);
    expect(json.body.grupos[0]).toMatchObject({ nombre: "G" });
    expect(json.body.grupos[0].favoritos).toHaveLength(1);
  });

  it("formato desconocido responde 400 e ida y vuelta funciona", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "ex@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    const malo = await request(ctx.app).get("/api/v1/export?formato=xml").set(auth);
    expect(malo.status).toBe(400);

    await request(ctx.app).post("/api/v1/groups").set(auth).send({ nombre: "G" });
    const json = await request(ctx.app).get("/api/v1/export?formato=json").set(auth);

    const tokenB = await registrar(ctx.app, "otro@ejemplo.com");
    const imp = await request(ctx.app)
      .post("/api/v1/import")
      .set("Authorization", `Bearer ${tokenB}`)
      .attach("fichero", Buffer.from(JSON.stringify(json.body)), {
        filename: "copia.json",
        contentType: "application/json",
      });
    expect(imp.status).toBe(200);
    expect(imp.body.creados).toEqual({ grupos: 1, favoritos: 0 });
  });
});
