import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, registrar, type TestContext } from "./helpers.js";

let ctx: TestContext | undefined;
afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
});

async function crearGrupo(token: string, nombre: string): Promise<string> {
  const res = await request(ctx!.app)
    .post("/api/v1/groups")
    .set("Authorization", `Bearer ${token}`)
    .send({ nombre });
  expect(res.status).toBe(201);
  return res.body.grupo.id as string;
}

describe("POST /api/v1/bookmarks", () => {
  it("creación válida devuelve 201 con orden correlativo", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "f@ejemplo.com");
    const grupo = await crearGrupo(token, "G");
    const auth = { Authorization: `Bearer ${token}` };

    const primero = await request(ctx.app)
      .post("/api/v1/bookmarks")
      .set(auth)
      .send({ groupId: grupo, titulo: "Ejemplo", url: "https://ejemplo.com" });
    expect(primero.status).toBe(201);
    expect(primero.body.favorito).toMatchObject({
      groupId: grupo,
      titulo: "Ejemplo",
      url: "https://ejemplo.com",
      orden: 0,
      visitas: 0,
    });

    const segundo = await request(ctx.app)
      .post("/api/v1/bookmarks")
      .set(auth)
      .send({ groupId: grupo, titulo: "Otro", url: "http://otro.com/x" });
    expect(segundo.body.favorito.orden).toBe(1);
  });

  it("url o grupo inválidos responden 400 o 404", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "f@ejemplo.com");
    const grupo = await crearGrupo(token, "G");
    const auth = { Authorization: `Bearer ${token}` };

    const malaUrl = await request(ctx.app)
      .post("/api/v1/bookmarks")
      .set(auth)
      .send({ groupId: grupo, titulo: "X", url: "javascript:alert(1)" });
    expect(malaUrl.status).toBe(400);

    const grupoAjeno = await request(ctx.app)
      .post("/api/v1/bookmarks")
      .set(auth)
      .send({ groupId: "00000000-0000-0000-0000-000000000000", titulo: "X", url: "https://x.com" });
    expect(grupoAjeno.status).toBe(404);
  });

  it("sin sesión responde 401", async () => {
    ctx = createTestApp();
    const res = await request(ctx.app)
      .post("/api/v1/bookmarks")
      .send({ groupId: "x", titulo: "X", url: "https://x.com" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/bookmarks", () => {
  it("filtra por grupo propio y nunca mezcla usuarios", async () => {
    ctx = createTestApp();
    const tokenA = await registrar(ctx.app, "fa@ejemplo.com");
    const tokenB = await registrar(ctx.app, "fb@ejemplo.com");
    const grupoA = await crearGrupo(tokenA, "GA");
    const otroA = await crearGrupo(tokenA, "GA2");

    await request(ctx.app)
      .post("/api/v1/bookmarks")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ groupId: await crearGrupo(tokenB, "GB"), titulo: "Ajeno", url: "https://ajeno.com" });
    await request(ctx.app)
      .post("/api/v1/bookmarks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ groupId: grupoA, titulo: "Uno", url: "https://uno.com" });
    await request(ctx.app)
      .post("/api/v1/bookmarks")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ groupId: otroA, titulo: "Dos", url: "https://dos.com" });

    const filtrado = await request(ctx.app)
      .get(`/api/v1/bookmarks?grupo=${grupoA}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(filtrado.status).toBe(200);
    expect(filtrado.body.favoritos.map((f: { titulo: string }) => f.titulo)).toEqual(["Uno"]);

    const todo = await request(ctx.app)
      .get("/api/v1/bookmarks")
      .set("Authorization", `Bearer ${tokenA}`);
    expect(todo.body.favoritos).toHaveLength(2);
  });

  it("grupo ajeno responde 404", async () => {
    ctx = createTestApp();
    const tokenA = await registrar(ctx.app, "ga@ejemplo.com");
    const tokenB = await registrar(ctx.app, "gb@ejemplo.com");
    const grupoB = await crearGrupo(tokenB, "GB");
    const res = await request(ctx.app)
      .get(`/api/v1/bookmarks?grupo=${grupoB}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });
});

async function crearFavorito(
  token: string,
  groupId: string,
  titulo = "T",
  url = "https://ejemplo.com",
): Promise<{ id: string; orden: number }> {
  const res = await request(ctx!.app)
    .post("/api/v1/bookmarks")
    .set("Authorization", `Bearer ${token}`)
    .send({ groupId, titulo, url });
  expect(res.status).toBe(201);
  return res.body.favorito;
}

describe("PUT /api/v1/bookmarks/:id", () => {
  it("edita título y url propios", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "e@ejemplo.com");
    const grupo = await crearGrupo(token, "G");
    const fav = await crearFavorito(token, grupo, "Viejo", "https://viejo.com");
    const res = await request(ctx.app)
      .put(`/api/v1/bookmarks/${fav.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ titulo: "Nuevo", url: "https://nuevo.com/x" });
    expect(res.status).toBe(200);
    expect(res.body.favorito).toMatchObject({ titulo: "Nuevo", url: "https://nuevo.com/x" });
  });

  it("mueve al final del destino y compacta el origen", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "e@ejemplo.com");
    const origen = await crearGrupo(token, "Origen");
    const destino = await crearGrupo(token, "Destino");
    const a = await crearFavorito(token, origen, "A", "https://a.com");
    await crearFavorito(token, origen, "B", "https://b.com");
    await crearFavorito(token, destino, "C", "https://c.com");

    const res = await request(ctx.app)
      .put(`/api/v1/bookmarks/${a.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ groupId: destino });
    expect(res.status).toBe(200);
    expect(res.body.favorito).toMatchObject({ groupId: destino, orden: 1 });

    const enOrigen = await request(ctx.app)
      .get(`/api/v1/bookmarks?grupo=${origen}`)
      .set("Authorization", `Bearer ${token}`);
    expect(enOrigen.body.favoritos.map((f: { titulo: string; orden: number }) => [f.titulo, f.orden])).toEqual([
      ["B", 0],
    ]);
  });

  it("reordena contiguo dentro del grupo", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "e@ejemplo.com");
    const grupo = await crearGrupo(token, "G");
    const a = await crearFavorito(token, grupo, "A", "https://a.com");
    await crearFavorito(token, grupo, "B", "https://b.com");
    await crearFavorito(token, grupo, "C", "https://c.com");
    const res = await request(ctx.app)
      .put(`/api/v1/bookmarks/${a.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ orden: 2 });
    expect(res.status).toBe(200);
    const lista = await request(ctx.app)
      .get(`/api/v1/bookmarks?grupo=${grupo}`)
      .set("Authorization", `Bearer ${token}`);
    expect(
      lista.body.favoritos.map((f: { titulo: string; orden: number }) => [f.titulo, f.orden]),
    ).toEqual([
      ["B", 0],
      ["C", 1],
      ["A", 2],
    ]);
  });

  it("favorito ajeno responde 404", async () => {
    ctx = createTestApp();
    const tokenA = await registrar(ctx.app, "ea@ejemplo.com");
    const tokenB = await registrar(ctx.app, "eb@ejemplo.com");
    const grupoB = await crearGrupo(tokenB, "GB");
    const fav = await crearFavorito(tokenB, grupoB, "Ajeno", "https://ajeno.com");
    const res = await request(ctx.app)
      .put(`/api/v1/bookmarks/${fav.id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ titulo: "Robado" });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/bookmarks/:id y visitas", () => {
  it("borra un favorito propio y compacta", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "d@ejemplo.com");
    const grupo = await crearGrupo(token, "G");
    const fav = await crearFavorito(token, grupo, "Borrable", "https://borrable.com");
    await crearFavorito(token, grupo, "Otro", "https://otro.com");
    const res = await request(ctx.app)
      .delete(`/api/v1/bookmarks/${fav.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    const lista = await request(ctx.app)
      .get(`/api/v1/bookmarks?grupo=${grupo}`)
      .set("Authorization", `Bearer ${token}`);
    expect(
      lista.body.favoritos.map((f: { titulo: string; orden: number }) => [f.titulo, f.orden]),
    ).toEqual([["Otro", 0]]);
  });

  it("registra visitas de forma acumulativa", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "v@ejemplo.com");
    const grupo = await crearGrupo(token, "G");
    const fav = await crearFavorito(token, grupo, "V", "https://v.com");
    const auth = { Authorization: `Bearer ${token}` };
    const una = await request(ctx.app).post(`/api/v1/bookmarks/${fav.id}/visita`).set(auth);
    expect(una.body).toEqual({ ok: true, visitas: 1 });
    const dos = await request(ctx.app).post(`/api/v1/bookmarks/${fav.id}/visita`).set(auth);
    expect(dos.body).toEqual({ ok: true, visitas: 2 });
  });

  it("borrar un grupo arrastra sus favoritos sin dejar huérfanos", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "c@ejemplo.com");
    const grupo = await crearGrupo(token, "ConFav");
    await crearFavorito(token, grupo, "Huerfano?", "https://h.com");
    const borrado = await request(ctx.app)
      .delete(`/api/v1/groups/${grupo}`)
      .set("Authorization", `Bearer ${token}`);
    expect(borrado.status).toBe(200);
    const lista = await request(ctx.app).get("/api/v1/bookmarks").set("Authorization", `Bearer ${token}`);
    expect(lista.body.favoritos).toHaveLength(0);
  });
});
