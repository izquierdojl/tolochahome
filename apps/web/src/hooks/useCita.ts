import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api.js";

const DIEZ_MINUTOS = 10 * 60 * 1000;

export interface CitaDelDia {
  texto: string;
  autor: string;
  descripcion?: string;
  /** Día de la cita, `AAAA-MM-DD`. */
  fecha: string;
  enlace: string;
  atribucion: { fuente: string; licencia: string; licenciaUrl: string };
}

/** Día local del navegador, `AAAA-MM-DD`. */
function hoyLocal(): string {
  const d = new Date();
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
}

/**
 * Cita del día (pública: no depende de la sesión). Sin cita disponible la
 * consulta queda en error y la cabecera oculta el emblema. Si la cita guardada
 * no es de hoy se considera caducada, así que al volver a la pestaña se pide de nuevo.
 */
export function useCita() {
  return useQuery({
    queryKey: ["cita"],
    queryFn: async (): Promise<CitaDelDia> => (await api<{ cita: CitaDelDia }>("/api/v1/cita")).cita,
    retry: false,
    staleTime: (consulta) => (consulta.state.data?.fecha === hoyLocal() ? DIEZ_MINUTOS : 0),
    refetchOnWindowFocus: true,
  });
}
