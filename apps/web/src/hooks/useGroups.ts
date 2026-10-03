import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, esApiError } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";

export interface Grupo {
  id: string;
  nombre: string;
  orden: number;
  favoritos: number;
}

const CLAVE = ["grupos"];

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

export function useGroups() {
  const estado = useAuthStore((s) => s.estado);
  return useQuery({
    queryKey: CLAVE,
    enabled: estado === "autenticada",
    queryFn: () =>
      conSesion((token) => api<{ grupos: Grupo[] }>("/api/v1/groups", { token })),
    select: (res) => res.grupos,
  });
}

function useInvalidar() {
  const cliente = useQueryClient();
  return () => cliente.invalidateQueries({ queryKey: CLAVE });
}

export function useCrearGrupo() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (nombre: string) =>
      conSesion((token) =>
        api<{ grupo: Grupo }>("/api/v1/groups", { method: "POST", body: { nombre }, token }),
      ),
    onSuccess: invalidar,
  });
}

export function useRenombrarGrupo() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, nombre }: { id: string; nombre: string }) =>
      conSesion((token) =>
        api(`/api/v1/groups/${id}`, { method: "PUT", body: { nombre }, token }),
      ),
    onSuccess: invalidar,
  });
}

export function useMoverGrupo() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, orden }: { id: string; orden: number }) =>
      conSesion((token) =>
        api(`/api/v1/groups/${id}`, { method: "PUT", body: { orden }, token }),
      ),
    onSuccess: invalidar,
  });
}

export function useBorrarGrupo() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) =>
      conSesion((token) => api(`/api/v1/groups/${id}`, { method: "DELETE", token })),
    onSuccess: invalidar,
  });
}
