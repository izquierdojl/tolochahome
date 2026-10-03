import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export interface ApiErrorBody {
  error: { codigo: string; mensaje: string };
}

export function errorBody(codigo: string, mensaje: string): ApiErrorBody {
  return { error: { codigo, mensaje } };
}

/** Error HTTP con código de aplicación para el formato `{ error: { codigo, mensaje } }`. */
export class HttpError extends Error {
  constructor(
    public status: number,
    public codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** 404 para rutas desconocidas (incluye el fallback de la API, no la web). */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json(errorBody("NO_ENCONTRADO", "Recurso no encontrado"));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json(errorBody(err.codigo, err.message));
    return;
  }
  if (err instanceof ZodError) {
    const primero = err.issues[0];
    res
      .status(400)
      .json(errorBody("DATOS_INVALIDOS", `Datos inválidos: ${primero?.path.join(".") ?? "cuerpo"} — ${primero?.message ?? ""}`.trim()));
    return;
  }
  console.error(err);
  res.status(500).json(errorBody("ERROR_INTERNO", "Error interno del servidor"));
}
