import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers.js";

let ctx: TestContext | undefined;
afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
});

function refreshCookie(res: request.Response): string | undefined {
  const raw = res.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
  return cookies.find((c) => c.startsWith("tolocha-refresh="));
}

describe("POST /api/v1/auth/registro", () => {
  it("registro válido crea la cuenta e inicia sesión (201 + access + cookie httpOnly)", async () => {
    ctx = createTestApp();
    const res = await request(ctx.app)
      .post("/api/v1/auth/registro")
      .send({ email: "nueva@ejemplo.com", password: "secreta123" });

    expect(res.status).toBe(201);
    expect(res.body.usuario).toMatchObject({ email: "nueva@ejemplo.com" });
    expect(res.body.usuario.id).toBeTypeOf("string");
    expect(res.body.usuario).not.toHaveProperty("passwordHash");
    expect(res.body.accessToken).toBeTypeOf("string");
    const cookie = refreshCookie(res);
    expect(cookie).toBeDefined();
    expect(cookie).toContain("HttpOnly");
  });

  it("email duplicado responde 409", async () => {
    ctx = createTestApp();
    await request(ctx.app)
      .post("/api/v1/auth/registro")
      .send({ email: "repe@ejemplo.com", password: "secreta123" })
      .expect(201);
    const res = await request(ctx.app)
      .post("/api/v1/auth/registro")
      .send({ email: "REPE@ejemplo.com", password: "otraclave123" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: { codigo: "EMAIL_EN_USO", mensaje: "Ese email ya está registrado" },
    });
  });

  it("datos inválidos responden 400 con mensajes en español", async () => {
    ctx = createTestApp();
    const malEmail = await request(ctx.app)
      .post("/api/v1/auth/registro")
      .send({ email: "no-es-email", password: "secreta123" });
    expect(malEmail.status).toBe(400);
    expect(malEmail.body.error.codigo).toBe("DATOS_INVALIDOS");

    const corta = await request(ctx.app)
      .post("/api/v1/auth/registro")
      .send({ email: "corta@ejemplo.com", password: "corta" });
    expect(corta.status).toBe(400);
    expect(corta.body.error.mensaje).toContain("contraseña");
  });

  it("registro cerrado responde 403 y no crea la cuenta", async () => {
    ctx = createTestApp({ REGISTRATION_ENABLED: "false" });
    const res = await request(ctx.app)
      .post("/api/v1/auth/registro")
      .send({ email: "cerrado@ejemplo.com", password: "secreta123" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: { codigo: "REGISTRO_CERRADO", mensaje: "El registro de nuevas cuentas está cerrado" },
    });
    expect(refreshCookie(res)).toBeUndefined();
  });
});
