import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers.js";

let ctx: TestContext | undefined;
afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
});

function cookieValue(res: request.Response): string | undefined {
  const raw = res.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
  const found = cookies.find((c) => c.startsWith("tolocha-refresh="));
  return found?.split(";")[0].split("=")[1];
}

async function loginAgente(email = "refresh@ejemplo.com") {
  await request(ctx!.app).post("/api/v1/auth/registro").send({ email, password: "secreta123" });
  const agent = request.agent(ctx!.app);
  await agent.post("/api/v1/auth/login").send({ email, password: "secreta123" }).expect(200);
  return agent;
}

describe("POST /api/v1/auth/refresh", () => {
  it("renovación válida sin rotar cuando queda vida de sobra (misma cookie)", async () => {
    ctx = createTestApp();
    const agent = await loginAgente();
    const antes = await agent.post("/api/v1/auth/login").send({
      email: "refresh@ejemplo.com",
      password: "secreta123",
    });
    const res = await agent.post("/api/v1/auth/refresh");

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTypeOf("string");
    expect(res.body.usuario.email).toBe("refresh@ejemplo.com");
    // Sin rotación no se emite cookie nueva.
    expect(res.headers["set-cookie"]).toBeUndefined();
    expect(antes.body.accessToken).toBeTypeOf("string");
  });

  it("rota al acercarse el final de la vida (cookie nueva distinta)", async () => {
    ctx = createTestApp({ JWT_REFRESH_TTL: "5s", REFRESH_GRACE_MS: "60000" });
    await request(ctx.app)
      .post("/api/v1/auth/registro")
      .send({ email: "rota@ejemplo.com", password: "secreta123" });
    const login = await request(ctx.app)
      .post("/api/v1/auth/login")
      .send({ email: "rota@ejemplo.com", password: "secreta123" });
    const original = cookieValue(login);
    expect(original).toBeDefined();

    const res = await request(ctx.app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `tolocha-refresh=${original}`);
    expect(res.status).toBe(200);
    const nueva = cookieValue(res);
    expect(nueva).toBeDefined();
    expect(nueva).not.toBe(original);

    // Dentro de la gracia, el token antiguo aún renueva el acceso sin rotar de nuevo.
    const gracia = await request(ctx.app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `tolocha-refresh=${original}`);
    expect(gracia.status).toBe(200);
    expect(gracia.headers["set-cookie"]).toBeUndefined();
  });

  it("reutilización fuera de gracia responde 401 y revoca la cadena", async () => {
    ctx = createTestApp({ JWT_REFRESH_TTL: "5s", REFRESH_GRACE_MS: "0" });
    await request(ctx.app)
      .post("/api/v1/auth/registro")
      .send({ email: "robo@ejemplo.com", password: "secreta123" });
    const login = await request(ctx.app)
      .post("/api/v1/auth/login")
      .send({ email: "robo@ejemplo.com", password: "secreta123" });
    const original = cookieValue(login)!;

    const rotada = await request(ctx.app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `tolocha-refresh=${original}`);
    expect(rotada.status).toBe(200);
    const nueva = cookieValue(rotada)!;
    expect(nueva).not.toBe(original);

    // Reutilizar el token antiguo fuera de gracia → 401…
    const reuso = await request(ctx.app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `tolocha-refresh=${original}`);
    expect(reuso.status).toBe(401);
    expect(reuso.body.error.codigo).toBe("NO_AUTORIZADO");

    // …y la cadena queda revocada: ni el token nuevo vale ya.
    const trasRevocar = await request(ctx.app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `tolocha-refresh=${nueva}`);
    expect(trasRevocar.status).toBe(401);
  });

  it("sin cookie responde 401", async () => {
    ctx = createTestApp();
    const res = await request(ctx.app).post("/api/v1/auth/refresh");
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("NO_AUTORIZADO");
  });
});
