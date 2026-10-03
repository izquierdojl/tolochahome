import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers.js";

let ctx: TestContext | undefined;
afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
});

describe("POST /api/v1/auth/logout y GET /api/v1/auth/yo", () => {
  it("logout revoca el refresh: tras salir ya no renueva y limpia la cookie", async () => {
    ctx = createTestApp();
    const agent = request.agent(ctx.app);
    await agent
      .post("/api/v1/auth/registro")
      .send({ email: "salir@ejemplo.com", password: "secreta123" })
      .expect(201);

    const salida = await agent.post("/api/v1/auth/logout");
    expect(salida.status).toBe(200);
    expect(salida.body).toEqual({ ok: true });
    const limpieza = salida.headers["set-cookie"] as unknown as string[];
    expect(limpieza.some((c) => c.startsWith("tolocha-refresh=;") || c.includes("Max-Age=0"))).toBe(
      true,
    );

    const trasSalir = await agent.post("/api/v1/auth/refresh");
    expect(trasSalir.status).toBe(401);
  });

  it("logout sin sesión es idempotente (éxito sin filtrar nada)", async () => {
    ctx = createTestApp();
    const res = await request(ctx.app).post("/api/v1/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("GET /yo devuelve el perfil con access válido y 401 sin él", async () => {
    ctx = createTestApp();
    const registro = await request(ctx.app)
      .post("/api/v1/auth/registro")
      .send({ email: "yo@ejemplo.com", password: "secreta123" });
    const access = registro.body.accessToken as string;

    const conSesion = await request(ctx.app)
      .get("/api/v1/auth/yo")
      .set("Authorization", `Bearer ${access}`);
    expect(conSesion.status).toBe(200);
    expect(conSesion.body.usuario).toMatchObject({ email: "yo@ejemplo.com" });

    const sinSesion = await request(ctx.app).get("/api/v1/auth/yo");
    expect(sinSesion.status).toBe(401);
    expect(sinSesion.body).toEqual({
      error: { codigo: "NO_AUTORIZADO", mensaje: "Sesión no válida o caducada" },
    });
  });
});
