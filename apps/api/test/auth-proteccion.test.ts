import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers.js";

let ctx: TestContext | undefined;
afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
});

describe("Protección de rutas (middleware requireAuth)", () => {
  it("sin Authorization responde 401 con el formato de error", async () => {
    ctx = createTestApp();
    const res = await request(ctx.app).get("/api/v1/auth/yo");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { codigo: "NO_AUTORIZADO", mensaje: "Sesión no válida o caducada" },
    });
  });

  it("esquema distinto de Bearer responde 401", async () => {
    ctx = createTestApp();
    const res = await request(ctx.app).get("/api/v1/auth/yo").set("Authorization", "Basic abc");
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("NO_AUTORIZADO");
  });

  it("token manipulado responde 401", async () => {
    ctx = createTestApp();
    const registro = await request(ctx.app)
      .post("/api/v1/auth/registro")
      .send({ email: "m@ejemplo.com", password: "secreta123" });
    const access = `${registro.body.accessToken as string}x`;
    const res = await request(ctx.app).get("/api/v1/auth/yo").set("Authorization", `Bearer ${access}`);
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("NO_AUTORIZADO");
  });

  it("ruta inexistente de la API responde 404 con el formato de error", async () => {
    ctx = createTestApp();
    const res = await request(ctx.app).get("/api/v1/no-existe");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { codigo: "NO_ENCONTRADO", mensaje: "Recurso no encontrado" },
    });
  });
});
