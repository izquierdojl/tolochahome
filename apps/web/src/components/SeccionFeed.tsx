import { useState } from "react";
import type { EntradaFeed, Feed } from "../hooks/useFeeds.js";
import { dominioDe } from "./ImagenFavorito.js";
import { leerApertura, type Apertura } from "./MosaicoFavorito.js";
import { fechaRelativa } from "../lib/feeds.js";

function FilaEntrada({
  entrada,
  apertura,
}: {
  entrada: EntradaFeed;
  apertura: Apertura;
}) {
  const fecha = fechaRelativa(entrada.publicadoEn);
  const dominio = dominioDe(entrada.enlace);
  const meta = [fecha, dominio].filter(Boolean).join(" · ");

  return (
    <li className="py-2">
      <a
        href={entrada.enlace}
        target={apertura === "nueva" ? "_blank" : undefined}
        rel="noopener noreferrer"
        className="font-medium text-brand hover:underline"
      >
        {entrada.titulo}
      </a>
      {entrada.resumen && (
        <p className="mt-1 line-clamp-3 text-sm text-soft">{entrada.resumen}</p>
      )}
      {meta && <p className="mt-1 text-xs text-muted">{meta}</p>}
    </li>
  );
}

function textoActualizacion(feed: Feed): string {
  const cuando = fechaRelativa(feed.actualizadoEn);
  return cuando ? `Actualizado ${cuando}` : "Sin actualizar";
}

function textoPublicaciones(total: number): string {
  return `${total} ${total === 1 ? "publicación" : "publicaciones"}`;
}

export function SeccionFeed({
  feed,
  abierta,
  onAlternar,
}: {
  feed: Feed;
  abierta: boolean;
  onAlternar: () => void;
}) {
  const [verTodas, setVerTodas] = useState(false);
  const apertura = leerApertura();
  const visibles = verTodas ? feed.entradas : feed.entradas.slice(0, 10);
  const idPanel = `feed-${feed.id}`;

  return (
    <section aria-label={feed.titulo} className="rounded border border-line p-4">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierta}
        aria-controls={idPanel}
        className="flex min-h-[44px] w-full items-center gap-2 text-left"
      >
        <span className={`inline-block transition-transform ${abierta ? "" : "-rotate-90"}`}>
          ▾
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-lg font-bold">{feed.titulo}</span>
          <span className="block truncate text-xs text-muted">
            {textoActualizacion(feed)} · {textoPublicaciones(feed.entradas.length)}
          </span>
        </span>
        {feed.error && <span className="shrink-0 text-xs text-ochre-600">Error</span>}
      </button>

      {abierta && (
        <div id={idPanel} className="mt-2">
          {feed.error && (
            <p
              role="status"
              className="mb-2 rounded border border-ochre-600/40 bg-ochre-600/10 px-2 py-1 text-sm text-ochre-600"
            >
              No se pudo actualizar: {feed.error}. Se muestra la última copia.
            </p>
          )}
          {feed.entradas.length === 0 ? (
            <p className="text-sm text-muted">Sin publicaciones.</p>
          ) : (
            <>
              <ul className="divide-y divide-line">
                {visibles.map((entrada) => (
                  <FilaEntrada key={entrada.id} entrada={entrada} apertura={apertura} />
                ))}
              </ul>
              {feed.entradas.length > 10 && (
                <button
                  type="button"
                  onClick={() => setVerTodas((valor) => !valor)}
                  className="mt-2 min-h-[44px] w-full rounded border border-line px-3 text-sm text-soft"
                >
                  {verTodas ? "Ver menos" : "Ver las 30"}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
