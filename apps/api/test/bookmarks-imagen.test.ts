import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, registrar, type TestContext } from "./helpers.js";

let ctx: TestContext | undefined;
afterEach(() => {
  ctx?.cleanup();
  ctx = undefined;
});

// PNG mínimo válido (cabecera + IHDR + IEND).
const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48,
  0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00,
  0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08,
  0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59,
  0xe7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

async function contextoConFavorito(email = "img@ejemplo.com") {
  const token = await registrar(ctx!.app, email);
  const auth = { Authorization: `Bearer ${token}` };
  const grupo = await request(ctx!.app).post("/api/v1/groups").set(auth).send({ nombre: "G" });
  const fav = await request(ctx!.app).post("/api/v1/bookmarks").set(auth).send({
    groupId: grupo.body.grupo.id as string,
    titulo: "T",
    url: "https://ejemplo.com",
  });
  return { auth, favoritoId: fav.body.favorito.id as string };
}

describe("POST /api/v1/bookmarks/:id/imagen", () => {
  it("subida válida asocia la imagen y se sirve privada", async () => {
    ctx = createTestApp();
    const { auth, favoritoId } = await contextoConFavorito();
    const subida = await request(ctx.app)
      .post(`/api/v1/bookmarks/${favoritoId}/imagen`)
      .set(auth)
      .attach("imagen", PNG, { filename: "captura.png", contentType: "image/png" });
    expect(subida.status).toBe(200);
    const nombre = subida.body.favorito.imagen as string;
    expect(nombre).toMatch(/\.png$/);
    expect(existsSync(join(ctx.config.imagenesDir, nombre))).toBe(true);

    const servida = await request(ctx.app).get(`/api/v1/imagenes/${nombre}`).set(auth);
    expect(servida.status).toBe(200);
    expect(servida.headers["content-type"]).toBe("image/png");
  });

  it("tipo no permitido o más de 1 MB responde 400", async () => {
    ctx = createTestApp();
    const { auth, favoritoId } = await contextoConFavorito();
    const tipo = await request(ctx.app)
      .post(`/api/v1/bookmarks/${favoritoId}/imagen`)
      .set(auth)
      .attach("imagen", Buffer.from("hola"), { filename: "x.txt", contentType: "text/plain" });
    expect(tipo.status).toBe(400);

    const grande = await request(ctx.app)
      .post(`/api/v1/bookmarks/${favoritoId}/imagen`)
      .set(auth)
      .attach("imagen", Buffer.alloc(1_048_577, 0), { filename: "g.png", contentType: "image/png" });
    expect(grande.status).toBe(400);
  });

  it("favorito ajeno responde 404", async () => {
    ctx = createTestApp();
    const { favoritoId } = await contextoConFavorito("a@ejemplo.com");
    const tokenB = await registrar(ctx.app, "b@ejemplo.com");
    const res = await request(ctx.app)
      .post(`/api/v1/bookmarks/${favoritoId}/imagen`)
      .set("Authorization", `Bearer ${tokenB}`)
      .attach("imagen", PNG, { filename: "c.png", contentType: "image/png" });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/v1/imagenes/:fichero y DELETE", () => {
  it("sin sesión o de otro usuario responde 401/404", async () => {
    ctx = createTestApp();
    const { auth, favoritoId } = await contextoConFavorito();
    const subida = await request(ctx.app)
      .post(`/api/v1/bookmarks/${favoritoId}/imagen`)
      .set(auth)
      .attach("imagen", PNG, { filename: "c.png", contentType: "image/png" });
    const nombre = subida.body.favorito.imagen as string;

    const anonima = await request(ctx.app).get(`/api/v1/imagenes/${nombre}`);
    expect(anonima.status).toBe(401);

    const tokenB = await registrar(ctx.app, "otro@ejemplo.com");
    const ajena = await request(ctx.app)
      .get(`/api/v1/imagenes/${nombre}`)
      .set("Authorization", `Bearer ${tokenB}`);
    expect(ajena.status).toBe(404);

    const rara = await request(ctx.app).get("/api/v1/imagenes/../../x.png").set(auth);
    expect(rara.status).toBe(404);
  });

  it("borrar la imagen la quita del favorito y del disco", async () => {
    ctx = createTestApp();
    const { auth, favoritoId } = await contextoConFavorito();
    const subida = await request(ctx.app)
      .post(`/api/v1/bookmarks/${favoritoId}/imagen`)
      .set(auth)
      .attach("imagen", PNG, { filename: "c.png", contentType: "image/png" });
    const nombre = subida.body.favorito.imagen as string;

    const borrado = await request(ctx.app).delete(`/api/v1/bookmarks/${favoritoId}/imagen`).set(auth);
    expect(borrado.status).toBe(200);
    expect(borrado.body.favorito.imagen).toBeNull();
    expect(existsSync(join(ctx.config.imagenesDir, nombre))).toBe(false);
  });

  it("borrar el favorito borra su imagen del disco", async () => {
    ctx = createTestApp();
    const { auth, favoritoId } = await contextoConFavorito();
    const subida = await request(ctx.app)
      .post(`/api/v1/bookmarks/${favoritoId}/imagen`)
      .set(auth)
      .attach("imagen", PNG, { filename: "c.png", contentType: "image/png" });
    const nombre = subida.body.favorito.imagen as string;

    await request(ctx.app).delete(`/api/v1/bookmarks/${favoritoId}`).set(auth).expect(200);
    expect(existsSync(join(ctx.config.imagenesDir, nombre))).toBe(false);
  });
});
