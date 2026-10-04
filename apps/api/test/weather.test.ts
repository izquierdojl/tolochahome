import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, registrar, type TestContext } from "./helpers.js";

let ctx: TestContext | undefined;
afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
});

const MADRID = { nombre: "Madrid", lat: 40.4168, lon: -3.7038 };
const BARCELONA = { nombre: "Barcelona", lat: 41.3874, lon: 2.1686 };

describe("GET /api/v1/weather-locations", () => {
  it("sin sesión responde 401", async () => {
    ctx = createTestApp();
    const res = await request(ctx.app).get("/api/v1/weather-locations");
    expect(res.status).toBe(401);
  });

  it("empieza vacío y lista solo las ciudades propias", async () => {
    ctx = createTestApp();
    const tokenA = await registrar(ctx.app, "wa@ejemplo.com");
    const tokenB = await registrar(ctx.app, "wb@ejemplo.com");
    await request(ctx.app)
      .post("/api/v1/weather-locations")
      .set("Authorization", `Bearer ${tokenA}`)
      .send(MADRID);
    const a = await request(ctx.app)
      .get("/api/v1/weather-locations")
      .set("Authorization", `Bearer ${tokenA}`);
    const b = await request(ctx.app)
      .get("/api/v1/weather-locations")
      .set("Authorization", `Bearer ${tokenB}`);
    expect(a.body.ciudades).toHaveLength(1);
    expect(a.body.ciudades[0]).toMatchObject({ nombre: "Madrid", porDefecto: true });
    expect(b.body.ciudades).toHaveLength(0);
  });
});

describe("POST /api/v1/weather-locations", () => {
  it("crea una ciudad propia con 201 y la primera es la por defecto", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "w@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    const primera = await request(ctx.app).post("/api/v1/weather-locations").set(auth).send(MADRID);
    expect(primera.status).toBe(201);
    expect(primera.body.ciudad).toMatchObject({ nombre: "Madrid", orden: 0, porDefecto: true });
    const segunda = await request(ctx.app).post("/api/v1/weather-locations").set(auth).send(BARCELONA);
    expect(segunda.body.ciudad).toMatchObject({ orden: 1, porDefecto: false });
  });

  it("coordenadas fuera de rango responden 400", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "w@ejemplo.com");
    const res = await request(ctx.app)
      .post("/api/v1/weather-locations")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "Mal", lat: 120, lon: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error.codigo).toBe("DATOS_INVALIDOS");
  });

  it("nombre vacío responde 400", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "w@ejemplo.com");
    const res = await request(ctx.app)
      .post("/api/v1/weather-locations")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "   ", lat: 40, lon: -3 });
    expect(res.status).toBe(400);
  });
});

describe("PUT y DELETE /api/v1/weather-locations/:id", () => {
  it("marcar por defecto desmarca la anterior (una sola)", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "w@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    await request(ctx.app).post("/api/v1/weather-locations").set(auth).send(MADRID);
    const creada = await request(ctx.app).post("/api/v1/weather-locations").set(auth).send(BARCELONA);
    const id = creada.body.ciudad.id as string;
    const res = await request(ctx.app)
      .put(`/api/v1/weather-locations/${id}`)
      .set(auth)
      .send({ porDefecto: true });
    expect(res.status).toBe(200);
    expect(res.body.ciudad.porDefecto).toBe(true);
    const tras = await request(ctx.app).get("/api/v1/weather-locations").set(auth);
    expect(tras.body.ciudades.filter((c: { porDefecto: boolean }) => c.porDefecto)).toHaveLength(1);
    expect(tras.body.ciudades.find((c: { porDefecto: boolean }) => c.porDefecto).nombre).toBe("Barcelona");
  });

  it("renombrar y reordenar persisten", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "w@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    await request(ctx.app).post("/api/v1/weather-locations").set(auth).send(MADRID);
    const creada = await request(ctx.app).post("/api/v1/weather-locations").set(auth).send(BARCELONA);
    const id = creada.body.ciudad.id as string;
    await request(ctx.app)
      .put(`/api/v1/weather-locations/${id}`)
      .set(auth)
      .send({ nombre: "Barnacity", orden: 0 })
      .expect(200);
    const lista = await request(ctx.app).get("/api/v1/weather-locations").set(auth);
    expect(lista.body.ciudades[0]).toMatchObject({ nombre: "Barnacity", orden: 0 });
    expect(lista.body.ciudades[1].nombre).toBe("Madrid");
  });

  it("ciudad ajena responde 404", async () => {
    ctx = createTestApp();
    const tokenA = await registrar(ctx.app, "wa@ejemplo.com");
    const tokenB = await registrar(ctx.app, "wb@ejemplo.com");
    const creada = await request(ctx.app)
      .post("/api/v1/weather-locations")
      .set("Authorization", `Bearer ${tokenB}`)
      .send(MADRID);
    const id = creada.body.ciudad.id as string;
    await request(ctx.app)
      .put(`/api/v1/weather-locations/${id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ nombre: "Robada" })
      .expect(404);
    await request(ctx.app)
      .delete(`/api/v1/weather-locations/${id}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .expect(404);
  });

  it("borrar la por defecto promueve la primera por orden", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "w@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    const primera = await request(ctx.app).post("/api/v1/weather-locations").set(auth).send(MADRID);
    await request(ctx.app).post("/api/v1/weather-locations").set(auth).send(BARCELONA);
    await request(ctx.app)
      .delete(`/api/v1/weather-locations/${primera.body.ciudad.id}`)
      .set(auth)
      .expect(200);
    const tras = await request(ctx.app).get("/api/v1/weather-locations").set(auth);
    expect(tras.body.ciudades).toHaveLength(1);
    expect(tras.body.ciudades[0]).toMatchObject({ nombre: "Barcelona", porDefecto: true });
  });

  it("borrar la última deja la lista vacía", async () => {
    ctx = createTestApp();
    const token = await registrar(ctx.app, "w@ejemplo.com");
    const auth = { Authorization: `Bearer ${token}` };
    const creada = await request(ctx.app).post("/api/v1/weather-locations").set(auth).send(MADRID);
    await request(ctx.app)
      .delete(`/api/v1/weather-locations/${creada.body.ciudad.id}`)
      .set(auth)
      .expect(200);
    const tras = await request(ctx.app).get("/api/v1/weather-locations").set(auth);
    expect(tras.body.ciudades).toHaveLength(0);
  });
});
