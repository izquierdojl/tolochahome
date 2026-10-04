/** Cliente directo del navegador a Open-Meteo (forecast y geocoding), sin clave. */

const URL_FORECAST = "https://api.open-meteo.com/v1/forecast";
const URL_GEOCODING = "https://geocoding-api.open-meteo.com/v1/search";

export interface Coordenadas {
  lat: number;
  lon: number;
}

export interface HoraPrevision {
  hora: string;
  temperatura: number;
  codigo: number;
  lluvia: number;
}

export interface DatosTiempo {
  actual: {
    temperatura: number;
    sensacion: number;
    humedad: number;
    codigo: number;
    viento: number;
    esDia: boolean;
    hora: string;
  };
  max: number;
  min: number;
  proximasHoras: HoraPrevision[];
}

export interface ResultadoCiudad {
  nombre: string;
  lat: number;
  lon: number;
  region?: string;
  pais?: string;
}

interface RespuestaForecast {
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    wind_speed_10m?: number;
    is_day?: number;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    weather_code?: number[];
    precipitation_probability?: (number | null)[];
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
}

interface RespuestaGeocoding {
  results?: {
    name?: string;
    latitude?: number;
    longitude?: number;
    admin1?: string;
    country?: string;
  }[];
}

function aDatosTiempo(r: RespuestaForecast): DatosTiempo {
  const actual = r.current ?? {};
  const horaActual = actual.time ?? "";
  const tiempos = r.hourly?.time ?? [];
  const temperaturas = r.hourly?.temperature_2m ?? [];
  const codigos = r.hourly?.weather_code ?? [];
  const lluvia = r.hourly?.precipitation_probability ?? [];

  const claveHora = horaActual.slice(0, 13);
  let inicio = tiempos.findIndex((t) => t.slice(0, 13) === claveHora);
  if (inicio < 0) inicio = tiempos.findIndex((t) => t >= horaActual);
  if (inicio < 0) inicio = 0;

  const proximasHoras: HoraPrevision[] = tiempos.slice(inicio, inicio + 8).map((t, i) => ({
    hora: t.slice(11, 16),
    temperatura: temperaturas[inicio + i] ?? 0,
    codigo: codigos[inicio + i] ?? 0,
    lluvia: lluvia[inicio + i] ?? 0,
  }));

  return {
    actual: {
      temperatura: actual.temperature_2m ?? 0,
      sensacion: actual.apparent_temperature ?? 0,
      humedad: actual.relative_humidity_2m ?? 0,
      codigo: actual.weather_code ?? 0,
      viento: actual.wind_speed_10m ?? 0,
      esDia: (actual.is_day ?? 1) === 1,
      hora: horaActual.slice(11, 16),
    },
    max: r.daily?.temperature_2m_max?.[0] ?? 0,
    min: r.daily?.temperature_2m_min?.[0] ?? 0,
    proximasHoras,
  };
}

/** Forecast de todas las ciudades en una sola petición multi-coordenada, en el mismo orden. */
export async function pedirTiempo(ciudades: Coordenadas[]): Promise<DatosTiempo[]> {
  if (ciudades.length === 0) return [];
  const params = new URLSearchParams({
    latitude: ciudades.map((c) => c.lat).join(","),
    longitude: ciudades.map((c) => c.lon).join(","),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    daily: "temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "2",
  });
  const res = await fetch(`${URL_FORECAST}?${params.toString()}`);
  if (!res.ok) throw new Error(`Open-Meteo respondió ${res.status}`);
  const datos = (await res.json()) as RespuestaForecast | RespuestaForecast[];
  const lista = Array.isArray(datos) ? datos : [datos];
  return lista.map(aDatosTiempo);
}

/** Busca ciudades por nombre en el geocoding de Open-Meteo (resultados en español). */
export async function buscarCiudades(
  texto: string,
  signal?: AbortSignal,
): Promise<ResultadoCiudad[]> {
  const consulta = texto.trim();
  if (consulta.length < 2) return [];
  const params = new URLSearchParams({
    name: consulta,
    count: "5",
    language: "es",
    format: "json",
  });
  const res = await fetch(`${URL_GEOCODING}?${params.toString()}`, { signal });
  if (!res.ok) throw new Error(`Geocoding respondió ${res.status}`);
  const datos = (await res.json()) as RespuestaGeocoding;
  return (datos.results ?? [])
    .filter(
      (r) =>
        typeof r.name === "string" &&
        typeof r.latitude === "number" &&
        typeof r.longitude === "number",
    )
    .map((r) => ({
      nombre: r.name!,
      lat: r.latitude!,
      lon: r.longitude!,
      region: r.admin1,
      pais: r.country,
    }));
}

/** Descripción textual del código WMO. */
export function condicion(codigo: number): string {
  if (codigo === 0) return "Despejado";
  if (codigo === 1) return "Mayormente despejado";
  if (codigo === 2) return "Parcialmente nublado";
  if (codigo === 3) return "Nublado";
  if (codigo === 45 || codigo === 48) return "Niebla";
  if (codigo >= 51 && codigo <= 57) return "Llovizna";
  if ((codigo >= 61 && codigo <= 67) || (codigo >= 80 && codigo <= 82)) return "Lluvia";
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return "Nieve";
  if (codigo >= 95) return "Tormenta";
  return "Nublado";
}

export type ClaveIcono =
  | "despejado-dia"
  | "despejado-noche"
  | "parcial-dia"
  | "parcial-noche"
  | "nublado"
  | "niebla"
  | "llovizna"
  | "lluvia"
  | "nieve"
  | "tormenta";

/** Clave de icono para un código WMO, distinguiendo día y noche. */
export function claveIcono(codigo: number, esDia: boolean): ClaveIcono {
  if (codigo === 0 || codigo === 1) return esDia ? "despejado-dia" : "despejado-noche";
  if (codigo === 2) return esDia ? "parcial-dia" : "parcial-noche";
  if (codigo === 3) return "nublado";
  if (codigo === 45 || codigo === 48) return "niebla";
  if (codigo >= 51 && codigo <= 57) return "llovizna";
  if ((codigo >= 61 && codigo <= 67) || (codigo >= 80 && codigo <= 82)) return "lluvia";
  if ((codigo >= 71 && codigo <= 77) || codigo === 85 || codigo === 86) return "nieve";
  if (codigo >= 95) return "tormenta";
  return "nublado";
}
