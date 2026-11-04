import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth.js";
import { useFeeds, useRefrescarFeeds } from "../hooks/useFeeds.js";
import { usePlegadosFeeds } from "../hooks/usePlegadosFeeds.js";
import { SeccionFeed } from "../components/SeccionFeed.js";
import { IconoFeeds } from "../components/Iconos.js";
import { esApiError } from "../lib/api.js";
import { textoIntervalo } from "../lib/feeds.js";

export function Feeds() {
  const usuario = useAuthStore((s) => s.usuario);
  const feeds = useFeeds();
  const refrescar = useRefrescarFeeds();
  const { abiertos, alternar } = usePlegadosFeeds(usuario?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const lista = feeds.data?.feeds ?? [];
  const intervalo = feeds.data?.ajustes.intervaloMin;

  async function actualizar() {
    setError(null);
    try {
      await refrescar.mutateAsync();
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudieron actualizar los feeds.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <IconoFeeds /> Feeds
          </h1>
          {intervalo !== undefined && (
            <p className="text-sm text-muted">
              Actualización cada {textoIntervalo(intervalo)}.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={actualizar}
          disabled={refrescar.isPending || feeds.isPending}
          className="min-h-[44px] rounded border border-line px-3 text-sm text-soft disabled:opacity-50"
        >
          {refrescar.isPending ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-ochre-600">
          {error}
        </p>
      )}
      {feeds.isPending && <p className="text-muted">Cargando feeds…</p>}
      {feeds.isError && (
        <p role="alert" className="text-sm text-ochre-600">
          {esApiError(feeds.error) ? feeds.error.mensaje : "No se pudieron cargar los feeds."}
        </p>
      )}
      {!feeds.isPending && !feeds.isError && lista.length === 0 && (
        <p className="rounded border border-line p-4 text-sm text-muted">
          Aún no sigues ningún canal. Añádelos en{" "}
          <Link to="/config" className="text-brand">
            Configuración
          </Link>
          .
        </p>
      )}
      {lista.map((feed) => (
        <SeccionFeed
          key={feed.id}
          feed={feed}
          abierta={abiertos.has(feed.id)}
          onAlternar={() => alternar(feed.id)}
        />
      ))}
    </div>
  );
}
