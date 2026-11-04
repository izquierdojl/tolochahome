import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, esApiError } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";

export interface EntradaFeed {
  id: string;
  titulo: string;
  enlace: string;
  resumen: string | null;
  publicadoEn: number | null;
}

export interface Feed {
  id: string;
  titulo: string;
  url: string;
  sitioUrl: string | null;
  orden: number;
  actualizadoEn: number | null;
  error: string | null;
  entradas: EntradaFeed[];
}

export interface FeedResumen {
  id: string;
  titulo: string;
  url: string;
  sitioUrl: string | null;
  orden: number;
  actualizadoEn: number | null;
  error: string | null;
}

export interface AjustesFeeds {
  intervaloMin: number;
}

export interface RespuestaFeeds {
  feeds: Feed[];
  ajustes: AjustesFeeds;
}

export interface RespuestaFeedsResumen {
  feeds: FeedResumen[];
  ajustes: AjustesFeeds;
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

/** Feeds con entradas. La API refresca los viejos y la web repite cada intervalo. */
export function useFeeds() {
  const estado = useAuthStore((s) => s.estado);
  return useQuery({
    queryKey: ["feeds"],
    enabled: estado === "autenticada",
    queryFn: () => conSesion((token) => api<RespuestaFeeds>("/api/v1/feeds", { token })),
    staleTime: (query) => {
      const datos = query.state.data;
      return datos ? datos.ajustes.intervaloMin * 60_000 : 0;
    },
    refetchInterval: (query) => {
      const datos = query.state.data;
      return datos ? datos.ajustes.intervaloMin * 60_000 : false;
    },
    refetchOnWindowFocus: true,
  });
}

/** Lista sin entradas y sin refrescar: la usa `/config` para no descargar feeds. */
export function useFeedsResumen() {
  const estado = useAuthStore((s) => s.estado);
  return useQuery({
    queryKey: ["feeds", "resumen"],
    enabled: estado === "autenticada",
    queryFn: () =>
      conSesion((token) =>
        api<RespuestaFeedsResumen>("/api/v1/feeds?resumen=1", { token }),
      ),
    staleTime: 30_000,
  });
}

function useInvalidarFeeds() {
  const cliente = useQueryClient();
  return () => cliente.invalidateQueries({ queryKey: ["feeds"] });
}

export function useCrearFeed() {
  const invalidar = useInvalidarFeeds();
  return useMutation({
    mutationFn: (url: string) =>
      conSesion((token) =>
        api<{ feed: Feed }>("/api/v1/feeds", { method: "POST", body: { url }, token }),
      ),
    onSuccess: invalidar,
  });
}

export function useBorrarFeed() {
  const invalidar = useInvalidarFeeds();
  return useMutation({
    mutationFn: (id: string) =>
      conSesion((token) => api(`/api/v1/feeds/${id}`, { method: "DELETE", token })),
    onSuccess: invalidar,
  });
}

export function useAjustesFeeds() {
  const invalidar = useInvalidarFeeds();
  return useMutation({
    mutationFn: (intervaloMin: number) =>
      conSesion((token) =>
        api<{ ajustes: AjustesFeeds }>("/api/v1/feeds/ajustes", {
          method: "PUT",
          body: { intervaloMin },
          token,
        }),
      ),
    onSuccess: invalidar,
  });
}

export function useRefrescarFeeds() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: () =>
      conSesion((token) =>
        api<RespuestaFeeds>("/api/v1/feeds/refrescar", { method: "POST", token }),
      ),
    onSuccess: (datos) => {
      cliente.setQueryData(["feeds"], datos);
      cliente.invalidateQueries({ queryKey: ["feeds", "resumen"] });
    },
  });
}
