import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers.js";

let ctx: TestContext | undefined;
afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
});

async function cuentaRegistrada(email = "login@ejemplo.com", password = "secreta123") {
  const res = await request(ctx!.app).post("/api/v1/auth/registro").send({ email, password });
  expect(res.status).toBe(201);
}

describe("POST /api/v1/auth/login", () => {
  it("credenciales válidas autentican (200 + access + cookie httpOnly)", async () => {
    ctx = createTestApp();
    await cuentaRegistrada();
    const res = await request(ctx.app)
      .post("/api/v1/auth/login")
      .send({ email: "login@ejemplo.com", password: "secreta123" });

    expect(res.status).toBe(200);
    expect(res.body.usuario).toMatchObject({ email: "login@ejemplo.com" });
    expect(res.body.accessToken).toBeTypeOf("string");
    const cookies = res.headers["set-cookie"] as unknown as string[];
    expect(cookies.some((c) => c.startsWith("tolocha-refresh=") && c.includes("HttpOnly"))).toBe(true);
  });

  it("contraseña incorrecta responde 401 genérico", async () => {
    ctx = createTestApp();
    await cuentaRegistrada();
    const res = await request(ctx.app)
      .post("/api/v1/auth/login")
      .send({ email: "login@ejemplo.com", password: "otra-clave-123" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: { codigo: "CREDENCIALES_INVALIDAS", mensaje: "Email o contraseña incorrectos" },
    });
  });

  it("email inexistente responde el mismo 401 (no revela existencia)", async () => {
    ctx = createTestApp();
    const res = await request(ctx.app)
      .post("/api/v1/auth/login")
      .send({ email: "nadie@ejemplo.com", password: "secreta123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({
      codigo: "CREDENCIALES_INVALIDAS",
      mensaje: "Email o contraseña incorrectos",
    });
  });

  it("con el registro cerrado el login de cuentas existentes sigue operativo", async () => {
    ctx = createTestApp();
    await cuentaRegistrada();
    // Misma BD, configuración con registro cerrado.
    const { createApp } = await import("../src/app.js");
    const appCerrada = createApp(ctx.db, { ...ctx.config, registrationEnabled: false });
    const denegado = await request(appCerrada)
      .post("/api/v1/auth/registro")
      .send({ email: "otra@ejemplo.com", password: "secreta123" });
    expect(denegado.status).toBe(403);

    const res = await request(appCerrada)
      .post("/api/v1/auth/login")
      .send({ email: "login@ejemplo.com", password: "secreta123" });
    expect(res.status).toBe(200);
    expect(res.body.usuario.email).toBe("login@ejemplo.com");
  });
});
