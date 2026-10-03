import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, esApiError } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";

export interface Favorito {
  id: string;
  groupId: string;
  titulo: string;
  url: string;
  orden: number;
  visitas: number;
  imagen: string | null;
}

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

export function useBookmarks(groupId?: string) {
  const estado = useAuthStore((s) => s.estado);
  return useQuery({
    queryKey: ["favoritos", groupId ?? "todos"],
    enabled: estado === "autenticada",
    queryFn: () =>
      conSesion((token) =>
        api<{ favoritos: Favorito[] }>(
          groupId ? `/api/v1/bookmarks?grupo=${encodeURIComponent(groupId)}` : "/api/v1/bookmarks",
          { token },
        ),
      ),
    select: (res) => res.favoritos,
  });
}

function useInvalidar() {
  const cliente = useQueryClient();
  return () => cliente.invalidateQueries({ queryKey: ["favoritos"] });
}

export function useCrearFavorito() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (datos: { groupId: string; titulo: string; url: string }) =>
      conSesion((token) =>
        api<{ favorito: Favorito }>("/api/v1/bookmarks", {
          method: "POST",
          body: datos,
          token,
        }),
      ),
    onSuccess: invalidar,
  });
}

export interface EdicionFavorito {
  id: string;
  titulo?: string;
  url?: string;
  groupId?: string;
  orden?: number;
  imagen?: string | null;
}

export function useEditarFavorito() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, ...cambios }: EdicionFavorito) =>
      conSesion((token) =>
        api<{ favorito: Favorito }>(`/api/v1/bookmarks/${id}`, {
          method: "PUT",
          body: cambios,
          token,
        }),
      ),
    onSuccess: invalidar,
  });
}

export function useBorrarFavorito() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) =>
      conSesion((token) => api(`/api/v1/bookmarks/${id}`, { method: "DELETE", token })),
    onSuccess: invalidar,
  });
}

export function useRegistrarVisita() {  return useMutation({
    mutationFn: (id: string) =>
      conSesion((token) => api(`/api/v1/bookmarks/${id}/visita`, { method: "POST", token })),
  });
}

async function subirFichero(token: string, id: string, fichero: File): Promise<Favorito> {
  const cuerpo = new FormData();
  cuerpo.append("imagen", fichero);
  const res = await fetch(`/api/v1/bookmarks/${id}/imagen`, {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${token}` },
    body: cuerpo,
  });
  const datos = (await res.json().catch(() => undefined)) as
    | { favorito?: Favorito; error?: { codigo?: string; mensaje?: string } }
    | undefined;
  if (!res.ok) {
    throw {
      status: res.status,
      codigo: datos?.error?.codigo ?? "ERROR_DESCONOCIDO",
      mensaje: datos?.error?.mensaje ?? `Error ${res.status}`,
    };
  }
  return datos!.favorito!;
}

export function useSubirImagen() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: ({ id, fichero }: { id: string; fichero: File }) =>
      conSesion((token) => subirFichero(token, id, fichero)),
    onSuccess: invalidar,
  });
}

export function useQuitarImagen() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (id: string) =>
      conSesion((token) =>
        api<{ favorito: Favorito }>(`/api/v1/bookmarks/${id}/imagen`, {
          method: "DELETE",
          token,
        }),
      ),
    onSuccess: invalidar,
  });
}

export interface VistaPrevia {
  titulo: string | null;
  imagen: string | null;
}

export function usePrevisualizar() {
  return useMutation({
    mutationFn: (url: string) =>
      conSesion((token) =>
        api<VistaPrevia>("/api/v1/bookmarks/previsualizar", {
          method: "POST",
          body: { url },
          token,
        }),
      ),
  });
}
