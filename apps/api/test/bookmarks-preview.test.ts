import { createServer, type Server } from "node:http";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, registrar, type TestContext } from "./helpers.js";

let ctx: TestContext | undefined;
afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
});

// PNG mínimo de 1x1.
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48,
  0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00,
  0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08,
  0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59,
  0xe7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

// Servidor local que imita una página con og:title y og:image.
let base = "";
let servidor: Server | undefined;
beforeAll(
  () =>
    new Promise<void>((fin) => {
      servidor = createServer((req, res) => {
        if (req.url === "/icon.png") {
          res.writeHead(200, { "Content-Type": "image/png" });
          res.end(PNG);
          return;
        }
        if (req.url === "/sin-imagen") {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end("<html><head><title>Solo título</title></head><body></body></html>");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          '<html><head><meta property="og:title" content="Título OG"><meta property="og:image" content="/icon.png"></head><body></body></html>',
        );
      }).listen(0, "127.0.0.1", () => {
        const dir = servidor!.address();
        base = typeof dir === "object" && dir ? `http://127.0.0.1:${dir.port}` : "";
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

describe("POST /api/v1/bookmarks/previsualizar", () => {
  it("devuelve título e imagen descargada", async () => {
    ctx = createTestApp({ PREVIEW_ALLOW_PRIVATE: "true" });
    const token = await registrar(ctx.app, "p@ejemplo.com");
    const res = await request(ctx.app)
      .post("/api/v1/bookmarks/previsualizar")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: `${base}/` });
    expect(res.status).toBe(200);
    expect(res.body.titulo).toBe("Título OG");
    expect(res.body.imagen).toMatch(/\.png$/);
    expect(existsSync(join(ctx.config.imagenesDir, res.body.imagen as string))).toBe(true);
  });

  it("sin og:image devuelve solo el título", async () => {
    ctx = createTestApp({ PREVIEW_ALLOW_PRIVATE: "true" });
    const token = await registrar(ctx.app, "p@ejemplo.com");
    const res = await request(ctx.app)
      .post("/api/v1/bookmarks/previsualizar")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: `${base}/sin-imagen` });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ titulo: "Solo título", imagen: null });
  });

  it("destino no público responde 400 sin la guarda desactivada", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "p@ejemplo.com");
    const res = await request(ctx.app)
      .post("/api/v1/bookmarks/previsualizar")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: `${base}/` });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("SIN_PREVISTA");
  });

  it("esquema no web responde 400", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "p@ejemplo.com");
    const res = await request(ctx.app)
      .post("/api/v1/bookmarks/previsualizar")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: "javascript:alert(1)" });
    expect(res.status).toBe(400);
  });

  it("sin sesión responde 401", async () => {
    ctx = createTestApp();
    const res = await request(ctx.app)
      .post("/api/v1/bookmarks/previsualizar")
      .send({ url: "https://ejemplo.com" });
    expect(res.status).toBe(401);
  });
});

describe("Adopción de imagen previsualizada", () => {
  it("crear con imagen previsualizada la asocia", async () => {
    ctx = createTestApp({ PREVIEW_ALLOW_PRIVATE: "true" });
    const token = await registrar(ctx.app, "ad@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    const grupo = await request(ctx.app).post("/api/v1/groups").set(auth).send({ nombre: "G" });
    const vista = await request(ctx.app)
      .post("/api/v1/bookmarks/previsualizar")
      .set(auth)
      .send({ url: `${base}/` });
    expect(vista.status).toBe(200);
    const creado = await request(ctx.app).post("/api/v1/bookmarks").set(auth).send({
      groupId: grupo.body.grupo.id as string,
      titulo: vista.body.titulo as string,
      url: `${base}/`,
      imagen: vista.body.imagen as string,
    });
    expect(creado.status).toBe(201);
    expect(creado.body.favorito.imagen).toBe(vista.body.imagen);
  });

  it("imagen inexistente responde 400", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "ad@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    const grupo = await request(ctx.app).post("/api/v1/groups").set(auth).send({ nombre: "G" });
    const res = await request(ctx.app).post("/api/v1/bookmarks").set(auth).send({
      groupId: grupo.body.grupo.id as string,
      titulo: "T",
      url: "https://ejemplo.com",
      imagen: "00000000-0000-0000-0000-000000000000.png",
    });
    expect(res.status).toBe(400);
  });
});
