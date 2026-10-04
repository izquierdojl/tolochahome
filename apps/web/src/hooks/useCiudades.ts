import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, esApiError } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";

export interface Ciudad {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
  orden: number;
  porDefecto: boolean;
}

const CLAVE = ["ciudades"] as const;

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

export function useCiudades() {
  const estado = useAuthStore((s) => s.estado);
  return useQuery({
    queryKey: CLAVE,
    enabled: estado === "autenticada",
    queryFn: () =>
      conSesion((token) => api<{ ciudades: Ciudad[] }>("/api/v1/weather-locations", { token })),
    select: (res) => res.ciudades,
  });
}

function useInvalidar() {
  const cliente = useQueryClient();
  return () => {
    cliente.invalidateQueries({ queryKey: CLAVE });
    cliente.invalidateQueries({ queryKey: ["tiempo"] });
  };
}

export interface DatosCiudad {
  nombre: string;
  lat: number;
  lon: number;
  porDefecto?: boolean;
}

export function useCrearCiudad() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (datos: DatosCiudad) =>
      conSesion((token) =>
        api<{ ciudad: Ciudad }>("/api/v1/weather-locations", { method: "POST", body: datos, token }),
      ),
    onSuccess: invalidar,
  });
}

export interface EdicionCiudad {
  id: string;
  nombre?: string;
  orden?: number;
  porDefecto?: boolean;
}

export function useEditarCiudad() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, ...cambios }: EdicionCiudad) =>
      conSesion((token) =>
        api<{ ciudad: Ciudad }>(`/api/v1/weather-locations/${id}`, {
          method: "PUT",
          body: cambios,
          token,
        }),
      ),
    onSuccess: invalidar,
  });
}

export function useBorrarCiudad() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) =>
      conSesion((token) => api(`/api/v1/weather-locations/${id}`, { method: "DELETE", token })),
    onSuccess: invalidar,
  });
}
