/** Cliente HTTP de la API: mismo origen, cookies incluidas, errores con formato. */

export interface ApiError {
  status: number;
  codigo: string;
  mensaje: string;
}

export function esApiError(err: unknown): err is ApiError {
  return (
    typeof err === "object" &&
    err !== null &&
    "codigo" in err &&
    "mensaje" in err &&
    "status" in err
  );
}

interface Opciones extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string;
}

export async function api<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  const cabeceras: Record<string, string> = { "Content-Type": "application/json" };
  if (opciones.token) cabeceras.Authorization = `Bearer ${opciones.token}`;
  const res = await fetch(ruta, {
    ...opciones,
    credentials: "include",
    headers: { ...cabeceras, ...(opciones.headers as Record<string, string> | undefined) },
    body: opciones.body === undefined ? undefined : JSON.stringify(opciones.body),
  });
  if (res.status === 204) return undefined as T;
  const datos = (await res.json().catch(() => undefined)) as
    | { error?: { codigo?: string; mensaje?: string } }
    | undefined;
  if (!res.ok) {
    throw {
      status: res.status,
      codigo: datos?.error?.codigo ?? "ERROR_DESCONOCIDO",
      mensaje: datos?.error?.mensaje ?? `Error ${res.status}`,
    } satisfies ApiError;
  }
  return datos as T;
}

export interface UsuarioBasico {
  id: string;
  email: string;
}

export interface RespuestaSesion {
  usuario: UsuarioBasico;
  accessToken: string;
}
