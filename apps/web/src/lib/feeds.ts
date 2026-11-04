/** Utilidades de presentación de feeds en la web. */

export const OPCIONES_INTERVALO = [
  { valor: 15, etiqueta: "15 minutos" },
  { valor: 30, etiqueta: "30 minutos" },
  { valor: 60, etiqueta: "1 hora" },
  { valor: 180, etiqueta: "3 horas" },
  { valor: 360, etiqueta: "6 horas" },
  { valor: 720, etiqueta: "12 horas" },
] as const;

export function textoIntervalo(minutos: number): string {
  const opcion = OPCIONES_INTERVALO.find((o) => o.valor === minutos);
  return opcion?.etiqueta ?? `${minutos} minutos`;
}

const RELATIVO = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

/** Texto relativo en español para una fecha epoch; null si no hay fecha. */
export function fechaRelativa(ms: number | null): string | null {
  if (ms === null) return null;
  const diferencia = ms - Date.now();
  const absoluta = Math.abs(diferencia);
  if (absoluta < 60_000) return RELATIVO.format(Math.round(diferencia / 1000), "second");
  if (absoluta < 3_600_000) return RELATIVO.format(Math.round(diferencia / 60_000), "minute");
  if (absoluta < 86_400_000) return RELATIVO.format(Math.round(diferencia / 3_600_000), "hour");
  if (absoluta < 2_592_000_000) {
    return RELATIVO.format(Math.round(diferencia / 86_400_000), "day");
  }
  if (absoluta < 31_536_000_000) {
    return RELATIVO.format(Math.round(diferencia / 2_592_000_000), "month");
  }
  return RELATIVO.format(Math.round(diferencia / 31_536_000_000), "year");
}
