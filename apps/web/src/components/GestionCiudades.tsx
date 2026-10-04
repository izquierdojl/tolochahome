import { useEffect, useState } from "react";
import { esApiError } from "../lib/api.js";
import { buscarCiudades, type ResultadoCiudad } from "../lib/tiempo.js";
import {
  useBorrarCiudad,
  useCiudades,
  useCrearCiudad,
  useEditarCiudad,
  type Ciudad,
} from "../hooks/useCiudades.js";
import { IconoBajar, IconoPapelera, IconoSubir } from "./Iconos.js";

function FilaCiudad({
  ciudad,
  primera,
  ultima,
}: {
  ciudad: Ciudad;
  primera: boolean;
  ultima: boolean;
}) {
  const editar = useEditarCiudad();
  const borrar = useBorrarCiudad();
  const [nombre, setNombre] = useState(ciudad.nombre);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNombre(ciudad.nombre);
  }, [ciudad.nombre]);

  async function guardarNombre() {
    const limpio = nombre.trim();
    if (limpio === "" || limpio === ciudad.nombre) {
      setNombre(ciudad.nombre);
      return;
    }
    setError(null);
    try {
      await editar.mutateAsync({ id: ciudad.id, nombre: limpio });
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo renombrar");
      setNombre(ciudad.nombre);
    }
  }

  async function mover(destino: number) {
    setError(null);
    try {
      await editar.mutateAsync({ id: ciudad.id, orden: destino });
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo reordenar");
    }
  }

  async function marcarDefecto() {
    setError(null);
    try {
      await editar.mutateAsync({ id: ciudad.id, porDefecto: true });
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo marcar por defecto");
    }
  }

  async function eliminar() {
    setError(null);
    try {
      await borrar.mutateAsync(ciudad.id);
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo borrar");
    }
  }

  return (
    <li className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={guardarNombre}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          maxLength={60}
          aria-label={`Nombre de ${ciudad.nombre}`}
          className="min-h-[44px] min-w-32 flex-1 rounded border border-line bg-surface px-2 text-sm"
        />
        <button
          type="button"
          onClick={marcarDefecto}
          aria-pressed={ciudad.porDefecto}
          disabled={ciudad.porDefecto}
          title="Ciudad por defecto"
          className={`min-h-[44px] rounded border px-2 text-sm ${
            ciudad.porDefecto ? "border-brand font-bold text-brand" : "border-line text-muted"
          }`}
        >
          Por defecto
        </button>
        <button
          type="button"
          onClick={() => mover(ciudad.orden - 1)}
          disabled={primera}
          aria-label={`Subir ${ciudad.nombre}`}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted disabled:opacity-40"
        >
          <IconoSubir />
        </button>
        <button
          type="button"
          onClick={() => mover(ciudad.orden + 1)}
          disabled={ultima}
          aria-label={`Bajar ${ciudad.nombre}`}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted disabled:opacity-40"
        >
          <IconoBajar />
        </button>
        <button
          type="button"
          onClick={eliminar}
          aria-label={`Borrar ${ciudad.nombre}`}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted"
        >
          <IconoPapelera />
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-ochre-600">
          {error}
        </p>
      )}
    </li>
  );
}

export function GestionCiudades() {
  const ciudades = useCiudades();
  const crear = useCrearCiudad();
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<ResultadoCiudad[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const consulta = texto.trim();
    if (consulta.length < 2) {
      setResultados([]);
      setBuscando(false);
      setBuscado(false);
      return;
    }
    const control = new AbortController();
    setBuscando(true);
    setBuscado(false);
    const temporizador = setTimeout(async () => {
      try {
        const res = await buscarCiudades(consulta, control.signal);
        setResultados(res);
        setError(null);
      } catch {
        if (!control.signal.aborted) {
          setResultados([]);
          setError("No se pudo buscar la ciudad");
        }
      } finally {
        if (!control.signal.aborted) {
          setBuscando(false);
          setBuscado(true);
        }
      }
    }, 350);
    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [texto]);

  async function anadir(r: ResultadoCiudad) {
    setError(null);
    try {
      await crear.mutateAsync({ nombre: r.nombre, lat: r.lat, lon: r.lon });
      setTexto("");
      setResultados([]);
      setBuscado(false);
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo añadir la ciudad");
    }
  }

  const lista = ciudades.data ?? [];

  return (
    <section className="space-y-3 rounded border border-line p-4">
      <h2 className="font-bold">Tiempo</h2>
      <div className="space-y-2">
        <label className="block text-sm text-soft">
          Buscar ciudad
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Madrid, Barcelona…"
            aria-label="Buscar ciudad"
            className="mt-1 block min-h-[44px] w-full rounded border border-line bg-surface px-2 text-sm"
          />
        </label>
        {buscando && <p className="text-sm text-muted">Buscando…</p>}
        {buscado && !buscando && resultados.length === 0 && !error && (
          <p className="text-sm text-muted">Sin resultados.</p>
        )}
        {resultados.length > 0 && (
          <ul className="space-y-1">
            {resultados.map((r) => (
              <li key={`${r.lat},${r.lon}`}>
                <button
                  type="button"
                  onClick={() => anadir(r)}
                  disabled={crear.isPending}
                  className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded border border-line px-2 text-left text-sm"
                >
                  <span>{r.nombre}</span>
                  <span className="text-muted">{[r.region, r.pais].filter(Boolean).join(", ")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-ochre-600">
          {error}
        </p>
      )}
      {ciudades.isPending && <p className="text-sm text-muted">Cargando ciudades…</p>}
      {!ciudades.isPending && lista.length === 0 && (
        <p className="text-sm text-muted">Aún no tienes ciudades. Busca una arriba para añadirla.</p>
      )}
      {lista.length > 0 && (
        <ul className="space-y-2">
          {lista.map((c, i) => (
            <FilaCiudad key={c.id} ciudad={c} primera={i === 0} ultima={i === lista.length - 1} />
          ))}
        </ul>
      )}
    </section>
  );
}
