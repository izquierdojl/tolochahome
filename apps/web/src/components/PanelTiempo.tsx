import { claveIcono, condicion, formatearPrecipitacion } from "../lib/tiempo.js";
import type { TiempoCiudad } from "../hooks/useTiempo.js";
import { IconoTiempo } from "./Iconos.js";

export interface PanelTiempoProps {
  tiempo: TiempoCiudad[];
  porDefectoId: string;
  onCambiarCiudad: (id: string) => void;
  cambiando: boolean;
}

function grados(n: number): string {
  return `${Math.round(n)}°`;
}

function TextoPrecipitacion({
  texto,
  etiqueta,
  className,
}: {
  texto: string;
  etiqueta: string;
  className?: string;
}) {
  return (
    <span
      className={className}
      aria-label={`${etiqueta}: ${texto.replace(/ mm$/, " milímetros")}`}
    >
      {texto}
    </span>
  );
}

export function PanelTiempo({
  tiempo,
  porDefectoId,
  onCambiarCiudad,
  cambiando,
}: PanelTiempoProps) {
  const seleccionada = tiempo.find((t) => t.ciudad.id === porDefectoId) ?? tiempo[0];
  if (!seleccionada) return null;
  const { ciudad, datos } = seleccionada;
  const lluviaProxima = datos.proximasHoras[0]?.lluvia ?? 0;
  const textoPrecipitacionHoy = formatearPrecipitacion(datos.dias[0]?.precipitacion ?? null);
  const textosPrecipitacionDias = datos.dias.map((d) =>
    formatearPrecipitacion(d.precipitacion),
  );
  const hayPrecipitacionSemana = textosPrecipitacionDias.some((texto) => texto !== null);

  return (
    <div className="max-h-[70vh] space-y-3 overflow-y-auto text-sm">
      <div className="flex items-center gap-3">
        <IconoTiempo
          clave={claveIcono(datos.actual.codigo, datos.actual.esDia)}
          width={40}
          height={40}
          className="text-brand"
        />
        <div>
          <p className="text-2xl font-bold">{grados(datos.actual.temperatura)}</p>
          <p className="text-soft">{condicion(datos.actual.codigo)}</p>
        </div>
      </div>
      <label className="block text-soft">
        Ciudad
        <select
          value={ciudad.id}
          onChange={(e) => onCambiarCiudad(e.target.value)}
          disabled={cambiando}
          className="mt-1 min-h-[44px] w-full rounded border border-line bg-surface px-2 text-sm"
        >
          {tiempo.map((t) => (
            <option key={t.ciudad.id} value={t.ciudad.id}>
              {t.ciudad.nombre}
              {t.ciudad.porDefecto ? " (por defecto)" : ""}
            </option>
          ))}
        </select>
      </label>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <div className="flex justify-between">
          <dt className="text-muted">Sensación</dt>
          <dd>{grados(datos.actual.sensacion)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Máx/Mín</dt>
          <dd>
            {grados(datos.max)} / {grados(datos.min)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Prob. lluvia</dt>
          <dd>{Math.round(lluviaProxima)}%</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Viento</dt>
          <dd>{Math.round(datos.actual.viento)} km/h</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Humedad</dt>
          <dd>{Math.round(datos.actual.humedad)}%</dd>
        </div>
        {textoPrecipitacionHoy && (
          <div className="flex justify-between">
            <dt className="text-muted">Precip. hoy</dt>
            <dd>
              <TextoPrecipitacion texto={textoPrecipitacionHoy} etiqueta="Precipitación hoy" />
            </dd>
          </div>
        )}
      </dl>
      <div>
        <p className="mb-1 text-muted">Próximas horas</p>
        <ul className="flex gap-3 overflow-x-auto pb-1">
          {datos.proximasHoras.map((h, i) => {
            const textoPrecipitacion = formatearPrecipitacion(h.precipitacion);
            return (
              <li key={`${h.hora}-${i}`} className="flex min-w-11 flex-col items-center gap-0.5">
                <span className="text-xs text-muted">{h.hora}</span>
                <IconoTiempo
                  clave={claveIcono(h.codigo, datos.actual.esDia)}
                  width={20}
                  height={20}
                />
                <span>{grados(h.temperatura)}</span>
                {textoPrecipitacion && (
                  <TextoPrecipitacion
                    texto={textoPrecipitacion}
                    etiqueta="Precipitación"
                    className="text-xs text-muted"
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {datos.dias.length > 0 && (
        <div>
          <p className="mb-1 text-muted">Próximos días</p>
          <ul className="space-y-1">
            {datos.dias.map((d, i) => {
              const textoPrecipitacion = textosPrecipitacionDias[i];
              return (
                <li key={d.fecha} className="flex items-center justify-between gap-2">
                  <span className="w-16 text-soft">{d.nombre}</span>
                  <IconoTiempo clave={claveIcono(d.codigo, true)} width={22} height={22} />
                  {hayPrecipitacionSemana && (
                    <span className="w-16 text-right">
                      {textoPrecipitacion ? (
                        <TextoPrecipitacion
                          texto={textoPrecipitacion}
                          etiqueta={`Precipitación del ${d.nombre}`}
                        />
                      ) : null}
                    </span>
                  )}
                  <span className="flex gap-1">
                    <span>{grados(d.max)}</span>
                    <span className="text-muted">/ {grados(d.min)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted">
        Actualizado a las {datos.actual.hora}. Datos de{" "}
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer"
          className="text-brand"
        >
          Open-Meteo
        </a>{" "}
        (CC BY 4.0).
      </p>
    </div>
  );
}
