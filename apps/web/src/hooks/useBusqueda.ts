import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, esApiError } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";

export interface Motor {
  id: string;
  nombre: string;
  urlTemplate: string;
  alias: string;
  sugerenciasUrl: string | null;
  orden: number;
  porDefecto: boolean;
}

const CLAVE = ["motores"];

/** Llama a la API con el access en memoria; si caducó, renueva una vez y reintenta. */
async function conSesion<T>(peticion: (token: string) => Promise<T>): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  if (!token) throw { status: 401, codigo: "NO_AUTORIZADO", mensaje: "Sin sesión" };
  try {
    return await peticion(token);
  } catch (err) {
    if (!esApiError(err) || err.status !== 401) throw err;
    const ok = await useAuthStore.getState().renovar();
    if (!ok) throw err;
    const nuevo = useAuthStore.getState().accessToken;
    if (!nuevo) throw err;
    return peticion(nuevo);
  }
}

export function useMotores() {
  const estado = useAuthStore((s) => s.estado);
  return useQuery({
    queryKey: CLAVE,
    enabled: estado === "autenticada",
    queryFn: () =>
      conSesion((token) => api<{ motores: Motor[] }>("/api/v1/search-engines", { token })),
    select: (res) => res.motores,
  });
}

function useInvalidar() {
  const cliente = useQueryClient();
  return () => cliente.invalidateQueries({ queryKey: CLAVE });
}

export interface DatosMotor {
  nombre: string;
  urlTemplate: string;
  alias: string;
  sugerenciasUrl?: string | null;
  porDefecto?: boolean;
}

export function useCrearMotor() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (datos: DatosMotor) =>
      conSesion((token) =>
        api<{ motor: Motor }>("/api/v1/search-engines", { method: "POST", body: datos, token }),
      ),
    onSuccess: invalidar,
  });
}

export interface EdicionMotor extends Partial<DatosMotor> {
  id: string;
  orden?: number;
}

export function useEditarMotor() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, ...cambios }: EdicionMotor) =>
      conSesion((token) =>
        api<{ motor: Motor }>(`/api/v1/search-engines/${id}`, {
          method: "PUT",
          body: cambios,
          token,
        }),
      ),
    onSuccess: invalidar,
  });
}

export function useBorrarMotor() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) =>
      conSesion((token) => api(`/api/v1/search-engines/${id}`, { method: "DELETE", token })),
    onSuccess: invalidar,
  });
}

/** Sugerencias del motor (señal abortable para debounce). */
export async function pedirSugerencias(
  motorId: string,
  texto: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(
    `/api/v1/sugerencias?motor=${encodeURIComponent(motorId)}&q=${encodeURIComponent(texto)}`,
    { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {}, signal },
  );
  if (!res.ok) return [];
  const datos = (await res.json().catch(() => undefined)) as
    | { sugerencias?: unknown }
    | undefined;
  return Array.isArray(datos?.sugerencias)
    ? datos.sugerencias.filter((s): s is string => typeof s === "string")
    : [];
}
