import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp, type TestContext } from "./helpers.js";

describe("GET /api/v1/health", () => {
  it("responde ok, servicio y versión del workspace", async () => {
    const ctx: TestContext = createTestApp();
    try {
      const res = await request(ctx.app).get("/api/v1/health");
      expect(res.status).toBe(200);
      const ruta = join(dirname(fileURLToPath(import.meta.url)), "..", "package.json");
      const esperada = (JSON.parse(readFileSync(ruta, "utf8")) as { version: string }).version;
      expect(res.body).toEqual({
        ok: true,
        servicio: "tolochahome",
        version: esperada,
        registroAbierto: true,
      });
    } finally {
      ctx.cleanup();
    }
  });
});
