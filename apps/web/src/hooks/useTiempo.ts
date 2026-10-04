import { useQuery } from "@tanstack/react-query";
import { pedirTiempo, type DatosTiempo } from "../lib/tiempo.js";
import { useAuthStore } from "../stores/auth.js";
import { useCiudades, type Ciudad } from "./useCiudades.js";

const UNA_HORA = 60 * 60 * 1000;

export interface TiempoCiudad {
  ciudad: Ciudad;
  datos: DatosTiempo;
}

/** Tiempo de todas las ciudades del usuario en una sola petición, con refresco horario. */
export function useTiempo() {
  const estado = useAuthStore((s) => s.estado);
  const ciudades = useCiudades();
  const lista = ciudades.data ?? [];
  const clave = lista.map((c) => `${c.lat},${c.lon}`).join("|");

  return useQuery({
    queryKey: ["tiempo", clave],
    enabled: estado === "autenticada" && lista.length > 0,
    queryFn: async (): Promise<TiempoCiudad[]> => {
      const datos = await pedirTiempo(lista.map((c) => ({ lat: c.lat, lon: c.lon })));
      return lista.flatMap((ciudad, i) => {
        const datosCiudad = datos[i];
        return datosCiudad ? [{ ciudad, datos: datosCiudad }] : [];
      });
    },
    staleTime: UNA_HORA,
    refetchInterval: UNA_HORA,
    refetchOnWindowFocus: true,
  });
}
