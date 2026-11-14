import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { ATRIBUCION, type Cita, type ServicioCita } from "../src/lib/cita.js";
import { createTestApp, type TestContext } from "./helpers.js";

let ctx: TestContext | undefined;
afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
  vi.restoreAllMocks();
});

const CITA: Cita = {
  texto: "La que llamamos casualidad no es más que la ignorancia de las causas físicas",
  autor: "Gottfried Leibniz",
  descripcion: "Filósofo y matemático alemán (fallecido el 14 de noviembre de 1716).",
  fecha: "2026-11-14",
  enlace: "https://es.wikiquote.org/wiki/Gottfried_Leibniz",
  atribucion: ATRIBUCION,
};

describe("GET /api/v1/cita", () => {
  it("es pública: responde 200 sin sesión con la forma de la spec", async () => {
    ctx = createTestApp({}, { obtener: async () => CITA });
    const res = await request(ctx.app).get("/api/v1/cita");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ cita: CITA });
    expect(res.body.cita.atribucion).toEqual({
      fuente: "Wikiquote",
      licencia: "CC BY-SA 4.0",
      licenciaUrl: "https://creativecommons.org/licenses/by-sa/4.0/deed.es",
    });
  });

  it("permite a proxy y navegador guardarla 10 minutos", async () => {
    ctx = createTestApp({}, { obtener: async () => CITA });
    const res = await request(ctx.app).get("/api/v1/cita");
    expect(res.headers["cache-control"]).toBe("public, max-age=600");
  });

  it("sin cita responde 503 CITA_NO_DISPONIBLE en español", async () => {
    ctx = createTestApp({}, { obtener: async () => null });
    const res = await request(ctx.app).get("/api/v1/cita");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      error: { codigo: "CITA_NO_DISPONIBLE", mensaje: "La cita del día no está disponible en este momento" },
    });
    expect(res.headers["cache-control"]).toBeUndefined();
  });

  it("no ignora los errores inesperados del servicio", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const roto: ServicioCita = {
      obtener: async () => {
        throw new Error("fallo interno");
      },
    };
    ctx = createTestApp({}, roto);
    const res = await request(ctx.app).get("/api/v1/cita");
    expect(res.status).toBeGreaterThanOrEqual(500);
  });

  it("ignora un token inválido: el endpoint no depende de la sesión", async () => {
    ctx = createTestApp({}, { obtener: async () => CITA });
    const res = await request(ctx.app).get("/api/v1/cita").set("Authorization", "Bearer basura");
    expect(res.status).toBe(200);
  });

  it("sin servicio inyectado en los tests no se llama a Wikimedia", async () => {
    const espia = vi.spyOn(globalThis, "fetch");
    ctx = createTestApp();
    const res = await request(ctx.app).get("/api/v1/cita");
    expect(res.status).toBe(503);
    expect(espia).not.toHaveBeenCalled();
  });
});
