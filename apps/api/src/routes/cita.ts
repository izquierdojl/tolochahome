import { Router } from "express";
import { HttpError } from "../errors.js";
import type { ServicioCita } from "../lib/cita.js";

export interface CitaDeps {
  servicio: ServicioCita;
}

/** Cita del día pública (sin sesión): no depende del usuario. */
export function createCitaRouter({ servicio }: CitaDeps): Router {
  const router = Router();

  router.get("/", async (_req, res) => {
    const cita = await servicio.obtener();
    if (!cita) {
      throw new HttpError(503, "CITA_NO_DISPONIBLE", "La cita del día no está disponible en este momento");
    }
    res.set("Cache-Control", "public, max-age=600");
    res.json({ cita });
  });

  return router;
}
