import { createServer, type Server } from "node:http";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { normalizarSugerencias } from "../src/routes/suggest.js";
import { createTestApp, registrar, type TestContext } from "./helpers.js";

let ctx: TestContext | undefined;
afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
});

describe("normalizarSugerencias", () => {
  it("opensearch Firefox/Google", () => {
    expect(normalizarSugerencias(["tol", ["tolocha", "toldo"], [], {}])).toEqual(["tolocha", "toldo"]);
  });
  it("DuckDuckGo ac", () => {
    expect(normalizarSugerencias([{ phrase: "a" }, { phrase: "b" }])).toEqual(["a", "b"]);
  });
  it("DuckDuckGo instantáneo", () => {
    expect(
      normalizarSugerencias({ RelatedTopics: [{ Text: "Uno" }, { Topics: [{ Text: "Dos" }] }] }),
    ).toEqual(["Uno", "Dos"]);
  });
  it("genérico y basura", () => {
    expect(normalizarSugerencias(["a", "b"])).toEqual(["a", "b"]);
    expect(normalizarSugerencias({ nope: 1 })).toEqual([]);
    expect(normalizarSugerencias(null)).toEqual([]);
  });
});

let base = "";
let servidor: Server | undefined;
beforeAll(
  () =>
    new Promise<void>((fin) => {
      servidor = createServer((req, res) => {
        if (req.url?.startsWith("/falla")) {
          res.writeHead(500);
          res.end("mal");
          return;
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(["q", ["uno", "dos"]]));
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

async function motorConSugerencias(url: string): Promise<{ token: string; id: string }> {
  const token = await registrar(ctx!.app, "sug@ejemplo.com");
  const auth = { Authorization: `Bearer ${token}` };
  const creado = await request(ctx!.app).post("/api/v1/search-engines").set(auth).send({
    nombre: "Local",
    alias: "local",
    urlTemplate: "https://ejemplo.com/?q={q}",
    sugerenciasUrl: `${url}?q={q}`,
  });
  expect(creado.status).toBe(201);
  return { token, id: creado.body.motor.id as string };
}

describe("GET /api/v1/sugerencias", () => {
  it("normaliza las del motor", async () => {
    ctx = createTestApp();
    const { token, id } = await motorConSugerencias(base);
    const res = await request(ctx.app)
      .get(`/api/v1/sugerencias?motor=${id}&q=hola`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sugerencias: ["uno", "dos"] });
  });

  it("fallo remoto degrada a lista vacía", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "sug@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    const creado = await request(ctx.app).post("/api/v1/search-engines").set(auth).send({
      nombre: "Roto",
      alias: "roto",
      urlTemplate: "https://ejemplo.com/?q={q}",
      sugerenciasUrl: `${base}/falla?q={q}`,
    });
    const res = await request(ctx.app)
      .get(`/api/v1/sugerencias?motor=${creado.body.motor.id}&q=hola`)
      .set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sugerencias: [] });
  });

  it("motor sin sugerencias o ajeno", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "sug@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    const lista = await request(ctx.app).get("/api/v1/search-engines").set(auth);
    const google = lista.body.motores.find((m: { alias: string }) => m.alias === "g");
    // Google sí trae; se crea uno sin URL para el caso vacío.
    const sin = await request(ctx.app).post("/api/v1/search-engines").set(auth).send({
      nombre: "Sin",
      alias: "sin",
      urlTemplate: "https://ejemplo.com/?q={q}",
    });
    const vacio = await request(ctx.app)
      .get(`/api/v1/sugerencias?motor=${sin.body.motor.id}&q=hola`)
      .set(auth);
    expect(vacio.body).toEqual({ sugerencias: [] });

    const tokenB = await registrar(ctx.app, "otro@ejemplo.com");
    const ajeno = await request(ctx.app)
      .get(`/api/v1/sugerencias?motor=${google.id}&q=hola`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(ajeno.status).toBe(404);
  });
});
