import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, esApiError, type UsuarioBasico } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";

/**
 * Sesión actual: intenta `/yo` con el access en memoria y, si caducó,
 * renueva una vez con la cookie antes de dar la sesión por perdida.
 */
export function useSesion() {
  const estado = useAuthStore((s) => s.estado);

  const consulta = useQuery({
    queryKey: ["sesion"],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<UsuarioBasico | null> => {
      const token = useAuthStore.getState().accessToken;
      if (token) {
        try {
          const res = await api<{ usuario: UsuarioBasico }>("/api/v1/auth/yo", { token });
          return res.usuario;
        } catch (err) {
          if (!esApiError(err) || err.status !== 401) throw err;
        }
      }
      const ok = await useAuthStore.getState().renovar();
      if (!ok) return null;
      const renovado = useAuthStore.getState().accessToken;
      if (!renovado) return null;
      const res = await api<{ usuario: UsuarioBasico }>("/api/v1/auth/yo", {
        token: renovado,
      });
      return res.usuario;
    },
  });

  useEffect(() => {
    if (consulta.data === undefined || useAuthStore.getState().estado !== "cargando") return;
    if (consulta.data) {
      const s = useAuthStore.getState();
      if (s.estado === "cargando" && s.accessToken) {
        s.iniciar({ usuario: consulta.data, accessToken: s.accessToken });
      }
    } else {
      useAuthStore.getState().marcarAnonima();
    }
  }, [consulta.data]);

  return { estado, consulta };
}
