import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, registrar, type TestContext } from "./helpers.js";

let ctx: TestContext | undefined;
afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
});

describe("GET /api/v1/search-engines", () => {
  it("crea las semillas g/w/d con Google por defecto", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "s@ejemplo.com");
    const res = await request(ctx.app).get("/api/v1/search-engines").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.motores.map((m: { alias: string }) => m.alias)).toEqual(["g", "w", "d"]);
    expect(res.body.motores.find((m: { alias: string }) => m.alias === "g").porDefecto).toBe(true);
  });

  it("no duplica semillas al listar dos veces", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "s@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    await request(ctx.app).get("/api/v1/search-engines").set(auth);
    const segunda = await request(ctx.app).get("/api/v1/search-engines").set(auth);
    expect(segunda.body.motores).toHaveLength(3);
  });

  it("sin sesión responde 401", async () => {
    ctx = createTestApp();
    const res = await request(ctx.app).get("/api/v1/search-engines");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/search-engines", () => {
  it("crea un motor propio con 201", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "s@ejemplo.com");
    const res = await request(ctx.app)
      .post("/api/v1/search-engines")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Startpage", alias: "sp", urlTemplate: "https://www.startpage.com/sp/search?query={q}" });
    expect(res.status).toBe(201);
    expect(res.body.motor).toMatchObject({ nombre: "Startpage", alias: "sp", orden: 3, porDefecto: false });
  });

  it("alias duplicado responde 400", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "s@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    const res = await request(ctx.app)
      .post("/api/v1/search-engines")
      .set(auth)
      .send({ nombre: "Otro Google", alias: "G", urlTemplate: "https://www.google.com/search?q={q}" });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("ALIAS_EN_USO");
  });

  it("plantilla sin {q} responde 400", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "s@ejemplo.com");
    const res = await request(ctx.app)
      .post("/api/v1/search-engines")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Malo", alias: "malo", urlTemplate: "https://ejemplo.com/buscar" });
    expect(res.status).toBe(400);
  });
});

describe("PUT y DELETE /api/v1/search-engines/:id", () => {
  it("marcar por defecto desmarca el anterior (uno solo)", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "s@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    const lista = await request(ctx.app).get("/api/v1/search-engines").set(auth);
    const wiki = lista.body.motores.find((m: { alias: string }) => m.alias === "w");
    const res = await request(ctx.app)
      .put(`/api/v1/search-engines/${wiki.id}`)
      .set(auth)
      .send({ porDefecto: true });
    expect(res.status).toBe(200);
    expect(res.body.motor.porDefecto).toBe(true);
    const tras = await request(ctx.app).get("/api/v1/search-engines").set(auth);
    expect(tras.body.motores.filter((m: { porDefecto: boolean }) => m.porDefecto)).toHaveLength(1);
  });

  it("motor ajeno responde 404", async () => {
    ctx = createTestApp();
    const tokenA = await registrar(ctx.app, "sa@ejemplo.com");
    const tokenB = await registrar(ctx.app, "sb@ejemplo.com");
    const listaB = await request(ctx.app)
      .get("/api/v1/search-engines")
      .set("Authorization", `Bearer ${tokenB}`);
    const id = listaB.body.motores[0].id as string;
    const res = await request(ctx.app)
      .delete(`/api/v1/search-engines/${id}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });

  it("borrar el por defecto promueve al primero", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "s@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    const lista = await request(ctx.app).get("/api/v1/search-engines").set(auth);
    const google = lista.body.motores.find((m: { alias: string }) => m.alias === "g");
    await request(ctx.app).delete(`/api/v1/search-engines/${google.id}`).set(auth).expect(200);
    const tras = await request(ctx.app).get("/api/v1/search-engines").set(auth);
    const activos = tras.body.motores.filter((m: { porDefecto: boolean }) => m.porDefecto);
    expect(activos).toHaveLength(1);
    expect(activos[0].alias).toBe("w");
  });
});
