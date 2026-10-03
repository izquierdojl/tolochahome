import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers.js";

let ctx: TestContext | undefined;
afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
});

export async function registrarYToken(email: string, password = "secreta123"): Promise<string> {
  const res = await request(ctx!.app).post("/api/v1/auth/registro").send({ email, password });
  expect(res.status).toBe(201);
  return res.body.accessToken as string;
}

describe("POST /api/v1/groups", () => {
  it("creación válida devuelve 201 con orden correlativo", async () => {
    ctx = createTestApp();
    const token = await registrarYToken("g@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };

    const primero = await request(ctx.app).post("/api/v1/groups").set(auth).send({ nombre: "Trabajo" });
    expect(primero.status).toBe(201);
    expect(primero.body.grupo).toMatchObject({ nombre: "Trabajo", orden: 0, favoritos: 0 });

    const segundo = await request(ctx.app).post("/api/v1/groups").set(auth).send({ nombre: "Ocio" });
    expect(segundo.status).toBe(201);
    expect(segundo.body.grupo).toMatchObject({ nombre: "Ocio", orden: 1 });
  });

  it("nombre inválido responde 400 en español", async () => {
    ctx = createTestApp();
    const token = await registrarYToken("g@ejemplo.com");
    const vacio = await request(ctx.app)
      .post("/api/v1/groups")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "   " });
    expect(vacio.status).toBe(400);

    const largo = await request(ctx.app)
      .post("/api/v1/groups")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "x".repeat(101) });
    expect(largo.status).toBe(400);
    expect(largo.body.error.mensaje).toContain("100");
  });

  it("sin sesión responde 401", async () => {
    ctx = createTestApp();
    const res = await request(ctx.app).post("/api/v1/groups").send({ nombre: "Trabajo" });
    expect(res.status).toBe(401);
    expect(res.body.error.codigo).toBe("NO_AUTORIZADO");
  });
});

describe("GET /api/v1/groups", () => {
  it("devuelve solo los grupos propios ordenados con su conteo", async () => {
    ctx = createTestApp();
    const tokenA = await registrarYToken("a@ejemplo.com");
    const tokenB = await registrarYToken("b@ejemplo.com");

    await request(ctx.app)
      .post("/api/v1/groups")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ nombre: "Ajeno" });
    await request(ctx.app)
      .post("/api/v1/groups")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Segundo" });
    await request(ctx.app)
      .post("/api/v1/groups")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Primero-bis" });

    const res = await request(ctx.app).get("/api/v1/groups").set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.grupos.map((g: { nombre: string }) => g.nombre)).toEqual([
      "Segundo",
      "Primero-bis",
    ]);
    for (const g of res.body.grupos) expect(g.favoritos).toBe(0);
  });

  it("sin sesión responde 401", async () => {
    ctx = createTestApp();
    const res = await request(ctx.app).get("/api/v1/groups");
    expect(res.status).toBe(401);
  });
});

async function crearGrupo(token: string, nombre: string): Promise<{ id: string; orden: number }> {
  const res = await request(ctx!.app)
    .post("/api/v1/groups")
    .set("Authorization", `Bearer ${token}`)
    .send({ nombre });
  expect(res.status).toBe(201);
  return res.body.grupo;
}

describe("GET /api/v1/groups con favoritos", () => {  it("el conteo refleja los favoritos reales de cada grupo", async () => {
    ctx = createTestApp();
    const token = await registrarYToken("c@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    const lleno = (await crearGrupo(token, "Lleno")).id;
    await crearGrupo(token, "Vacío");
    await request(ctx.app).post("/api/v1/bookmarks").set(auth).send({
      groupId: lleno,
      titulo: "Uno",
      url: "https://uno.com",
    });
    await request(ctx.app).post("/api/v1/bookmarks").set(auth).send({
      groupId: lleno,
      titulo: "Dos",
      url: "https://dos.com",
    });

    const res = await request(ctx.app).get("/api/v1/groups").set(auth);
    expect(res.status).toBe(200);
    const porNombre = new Map(res.body.grupos.map((g: { nombre: string; favoritos: number }) => [g.nombre, g.favoritos]));
    expect(porNombre.get("Lleno")).toBe(2);
    expect(porNombre.get("Vacío")).toBe(0);
  });
});

describe("PUT /api/v1/groups/:id", () => {
  it("renombra un grupo propio", async () => {
    ctx = createTestApp();
    const token = await registrarYToken("r@ejemplo.com");
    const grupo = await crearGrupo(token, "Antes");
    const res = await request(ctx.app)
      .put(`/api/v1/groups/${grupo.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Después" });
    expect(res.status).toBe(200);
    expect(res.body.grupo.nombre).toBe("Después");
  });

  it("reordena de forma contigua sin huecos", async () => {
    ctx = createTestApp();
    const token = await registrarYToken("r@ejemplo.com");
    const a = await crearGrupo(token, "A");
    await crearGrupo(token, "B");
    await crearGrupo(token, "C");
    const res = await request(ctx.app)
      .put(`/api/v1/groups/${a.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ orden: 2 });
    expect(res.status).toBe(200);
    expect(res.body.grupos.map((g: { nombre: string; orden: number }) => [g.nombre, g.orden])).toEqual([
      ["B", 0],
      ["C", 1],
      ["A", 2],
    ]);
  });

  it("grupo ajeno o inexistente responde 404", async () => {
    ctx = createTestApp();
    const tokenA = await registrarYToken("aa@ejemplo.com");
    const tokenB = await registrarYToken("bb@ejemplo.com");
    const ajeno = await crearGrupo(tokenB, "Ajeno");
    const sobreAjeno = await request(ctx.app)
      .put(`/api/v1/groups/${ajeno.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Robado" });
    expect(sobreAjeno.status).toBe(404);
    const inexistente = await request(ctx.app)
      .put("/api/v1/groups/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "X" });
    expect(inexistente.status).toBe(404);
  });
});

describe("DELETE /api/v1/groups/:id", () => {
  it("borra un grupo propio", async () => {
    ctx = createTestApp();
    const token = await registrarYToken("d@ejemplo.com");
    const grupo = await crearGrupo(token, "Borrable");
    const res = await request(ctx.app)
      .delete(`/api/v1/groups/${grupo.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    const lista = await request(ctx.app).get("/api/v1/groups").set("Authorization", `Bearer ${token}`);
    expect(lista.body.grupos).toHaveLength(0);
  });

  it("borrado ajeno responde 404", async () => {
    ctx = createTestApp();
    const tokenA = await registrarYToken("da@ejemplo.com");
    const tokenB = await registrarYToken("db@ejemplo.com");
    const ajeno = await crearGrupo(tokenB, "Ajeno");
    const res = await request(ctx.app)
      .delete(`/api/v1/groups/${ajeno.id}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });
});

describe("Color de grupo", () => {
  it("crear con color válido lo guarda y lo devuelve", async () => {
    ctx = createTestApp();
    const token = await registrarYToken("col@ejemplo.com");
    const res = await request(ctx.app)
      .post("/api/v1/groups")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Color", color: "#3c6a4d" });
    expect(res.status).toBe(201);
    expect(res.body.grupo.color).toBe("#3c6a4d");

    const lista = await request(ctx.app).get("/api/v1/groups").set("Authorization", `Bearer ${token}`);
    expect(lista.body.grupos[0].color).toBe("#3c6a4d");
  });

  it("color inválido responde 400", async () => {
    ctx = createTestApp();
    const token = await registrarYToken("col@ejemplo.com");
    const res = await request(ctx.app)
      .post("/api/v1/groups")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Color", color: "rojo" });
    expect(res.status).toBe(400);
  });

  it("renombrar puede cambiar y quitar el color", async () => {
    ctx = createTestApp();
    const token = await registrarYToken("col@ejemplo.com");
    const grupo = await crearGrupo(token, "C");
    const auth = { Authorization: `Bearer ${token}` };
    const cambio = await request(ctx.app)
      .put(`/api/v1/groups/${grupo.id}`)
      .set(auth)
      .send({ color: "#a67430" });
    expect(cambio.status).toBe(200);
    expect(cambio.body.grupo.color).toBe("#a67430");
    const quitado = await request(ctx.app)
      .put(`/api/v1/groups/${grupo.id}`)
      .set(auth)
      .send({ color: null });
    expect(quitado.status).toBe(200);
    expect(quitado.body.grupo.color).toBeNull();
  });
});
