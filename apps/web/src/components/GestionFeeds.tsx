import { useEffect, useState } from "react";
import { esApiError } from "../lib/api.js";
import { OPCIONES_INTERVALO, textoIntervalo } from "../lib/feeds.js";
import {
  useAjustesFeeds,
  useBorrarFeed,
  useCrearFeed,
  useFeedsResumen,
} from "../hooks/useFeeds.js";
import { IconoPapelera } from "./Iconos.js";

export function GestionFeeds() {
  const feeds = useFeedsResumen();
  const crear = useCrearFeed();
  const borrar = useBorrarFeed();
  const ajustes = useAjustesFeeds();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [intervalo, setIntervalo] = useState(30);
  const intervaloGuardado = feeds.data?.ajustes.intervaloMin;

  useEffect(() => {
    if (intervaloGuardado !== undefined) setIntervalo(intervaloGuardado);
  }, [intervaloGuardado]);

  async function anadir(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAviso(null);
    if (!url.trim()) return;
    try {
      const res = await crear.mutateAsync(url.trim());
      setAviso(`Canal añadido: ${res.feed.titulo}`);
      setUrl("");
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo añadir el canal");
    }
  }

  async function eliminar(id: string, titulo: string) {
    setError(null);
    setAviso(null);
    try {
      await borrar.mutateAsync(id);
      setAviso(`Canal eliminado: ${titulo}`);
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo borrar el canal");
    }
  }

  async function cambiarIntervalo(valor: number) {
    const anterior = intervalo;
    setIntervalo(valor);
    setError(null);
    setAviso(null);
    try {
      await ajustes.mutateAsync(valor);
    } catch (err) {
      setIntervalo(anterior);
      setError(esApiError(err) ? err.mensaje : "No se pudo cambiar el intervalo");
    }
  }

  const lista = feeds.data?.feeds ?? [];

  return (
    <section className="space-y-3 rounded border border-line p-4">
      <h2 className="font-bold">Feeds</h2>
      <p className="text-sm text-muted">
        Añade canales RSS/Atom por la URL del feed o por la URL del sitio; si es una
        página, se buscará el feed automáticamente.
      </p>
      <form onSubmit={anadir} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://ejemplo.com/feed"
          aria-label="URL del feed"
          className="min-h-[44px] min-w-48 flex-1 rounded border border-line bg-surface px-2 text-sm"
        />
        <button
          type="submit"
          disabled={crear.isPending || !url.trim()}
          className="min-h-[44px] rounded border border-line px-3 text-sm text-soft disabled:opacity-50"
        >
          {crear.isPending ? "Añadiendo…" : "Añadir"}
        </button>
      </form>
      {aviso && (
        <p role="status" className="text-sm text-brand">
          {aviso}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-ochre-600">
          {error}
        </p>
      )}
      <label className="block text-sm text-soft">
        Actualización automática
        <select
          value={intervalo}
          onChange={(e) => cambiarIntervalo(Number(e.target.value))}
          disabled={ajustes.isPending || feeds.isPending}
          className="mt-1 min-h-[44px] w-full rounded border border-line bg-surface px-2 text-sm"
        >
          {!OPCIONES_INTERVALO.some((opcion) => opcion.valor === intervalo) && (
            <option value={intervalo}>{textoIntervalo(intervalo)}</option>
          )}
          {OPCIONES_INTERVALO.map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      </label>
      {feeds.isPending && <p className="text-sm text-muted">Cargando canales…</p>}
      {feeds.isError && (
        <p role="alert" className="text-sm text-ochre-600">
          {esApiError(feeds.error) ? feeds.error.mensaje : "No se pudieron cargar los canales."}
        </p>
      )}
      {!feeds.isPending && !feeds.isError && lista.length === 0 && (
        <p className="text-sm text-muted">Aún no sigues ningún canal.</p>
      )}
      {lista.length > 0 && (
        <ul className="space-y-2">
          {lista.map((feed) => (
            <li
              key={feed.id}
              className="flex flex-wrap items-center gap-2 rounded border border-line px-2 py-1"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{feed.titulo}</span>
                <span className="block truncate text-xs text-muted" title={feed.url}>
                  {feed.url}
                </span>
                {feed.error && (
                  <span className="block text-xs text-ochre-600">Error: {feed.error}</span>
                )}
              </span>
              <button
                type="button"
                onClick={() => eliminar(feed.id, feed.titulo)}
                disabled={borrar.isPending}
                title={`Borrar ${feed.titulo}`}
                aria-label={`Borrar ${feed.titulo}`}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted disabled:opacity-50"
              >
                <IconoPapelera />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
