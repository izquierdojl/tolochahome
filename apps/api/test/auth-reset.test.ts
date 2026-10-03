import { afterEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { passwordResetTokens, users } from "../src/db/schema.js";
import { hashToken, newOpaqueToken } from "../src/lib/tokens.js";
import { createTestApp, type TestContext } from "./helpers.js";

let ctx: TestContext | undefined;
afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
  vi.restoreAllMocks();
});

async function cuenta(email = "reset@ejemplo.com", password = "secreta123") {
  const res = await request(ctx!.app).post("/api/v1/auth/registro").send({ email, password });
  expect(res.status).toBe(201);
  return dbUsuario(email)!;
}

function dbUsuario(email: string) {
  return ctx!.db.select().from(users).where(eq(users.email, email)).get();
}

/** Pide un reset y devuelve el token emitido (capturado del log del servidor). */
async function pedirReset(email: string): Promise<string> {
  const tokens: string[] = [];
  const espia = vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    const texto = args.map(String).join(" ");
    const match = /Token de restablecimiento para .*: ([0-9a-f]+)/.exec(texto);
    if (match) tokens.push(match[1]);
  });
  try {
    const res = await request(ctx!.app).post("/api/v1/auth/password/reset-request").send({ email });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  } finally {
    espia.mockRestore();
  }
  expect(tokens).toHaveLength(1);
  return tokens[0];
}

describe("POST /api/v1/auth/password/reset-request", () => {
  it("responde éxito y crea token para un email existente", async () => {
    ctx = createTestApp();
    await cuenta();
    await pedirReset("reset@ejemplo.com");
    const filas = ctx.db.select().from(passwordResetTokens).all();
    expect(filas).toHaveLength(1);
    expect(filas[0].usedAt).toBeNull();
  });

  it("responde el mismo éxito para un email inexistente sin crear nada", async () => {
    ctx = createTestApp();
    const res = await request(ctx!.app)
      .post("/api/v1/auth/password/reset-request")
      .send({ email: "nadie@ejemplo.com" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(ctx!.db.select().from(passwordResetTokens).all()).toHaveLength(0);
  });
});

describe("POST /api/v1/auth/password/reset-confirm", () => {
  it("token válido cambia la contraseña, revoca sesiones e invalida el token", async () => {
    ctx = createTestApp();
    const antes = await cuenta();
    const agent = request.agent(ctx.app);
    await agent
      .post("/api/v1/auth/login")
      .send({ email: "reset@ejemplo.com", password: "secreta123" })
      .expect(200);

    const token = await pedirReset("reset@ejemplo.com");
    const res = await request(ctx.app)
      .post("/api/v1/auth/password/reset-confirm")
      .send({ token, password: "nueva-clave-456" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // La contraseña cambió.
    const loginViejo = await request(ctx.app)
      .post("/api/v1/auth/login")
      .send({ email: "reset@ejemplo.com", password: "secreta123" });
    expect(loginViejo.status).toBe(401);
    const loginNuevo = await request(ctx.app)
      .post("/api/v1/auth/login")
      .send({ email: "reset@ejemplo.com", password: "nueva-clave-456" });
    expect(loginNuevo.status).toBe(200);

    // Las sesiones anteriores quedaron revocadas.
    const refresco = await agent.post("/api/v1/auth/refresh");
    expect(refresco.status).toBe(401);

    // El token es de un solo uso.
    const reuso = await request(ctx.app)
      .post("/api/v1/auth/password/reset-confirm")
      .send({ token, password: "otra-clave-789" });
    expect(reuso.status).toBe(400);
    expect(reuso.body.error.codigo).toBe("TOKEN_INVALIDO");
    expect(dbUsuario("reset@ejemplo.com")!.updatedAt).toBeGreaterThanOrEqual(antes.updatedAt);
  });

  it("token caducado responde 410 sin cambiar nada", async () => {
    ctx = createTestApp();
    const usuario = await cuenta();
    const token = newOpaqueToken();
    const ahora = Date.now();
    ctx.db
      .insert(passwordResetTokens)
      .values({
        tokenHash: hashToken(token),
        userId: usuario.id,
        createdAt: ahora - 7200_000,
        expiresAt: ahora - 1000,
      })
      .run();

    const res = await request(ctx.app)
      .post("/api/v1/auth/password/reset-confirm")
      .send({ token, password: "nueva-clave-456" });
    expect(res.status).toBe(410);
    expect(res.body.error.codigo).toBe("TOKEN_CADUCADO");
    const login = await request(ctx.app)
      .post("/api/v1/auth/login")
      .send({ email: "reset@ejemplo.com", password: "secreta123" });
    expect(login.status).toBe(200);
  });

  it("token inexistente responde 400", async () => {
    ctx = createTestApp();
    await cuenta();
    const res = await request(ctx.app)
      .post("/api/v1/auth/password/reset-confirm")
      .send({ token: "00".repeat(32), password: "nueva-clave-456" });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("TOKEN_INVALIDO");
  });
});
