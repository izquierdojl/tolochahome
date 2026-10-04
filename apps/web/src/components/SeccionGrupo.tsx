import { useState } from "react";
import type { Grupo } from "../hooks/useGroups.js";
import type { Favorito } from "../hooks/useBookmarks.js";
import { useBookmarks, useRegistrarVisita } from "../hooks/useBookmarks.js";
import { MosaicoFavorito, leerApertura, type ModoEnlace, type Apertura } from "../components/MosaicoFavorito.js";
import { ImagenFavorito, dominioDe } from "../components/ImagenFavorito.js";
import { IconoAbrirTodos } from "./Iconos.js";

function FilaFavorito({ favorito, apertura }: { favorito: Favorito; apertura: Apertura }) {
  const registrarVisita = useRegistrarVisita();
  const dominio = dominioDe(favorito.url);

  function abrir(e: React.MouseEvent) {
    e.preventDefault();
    registrarVisita.mutate(favorito.id);
    window.open(favorito.url, apertura === "nueva" ? "_blank" : "_self", "noopener");
  }

  return (
    <a
      href={favorito.url}
      onClick={abrir}
      title={`${favorito.titulo} — ${dominio}`}
      className="flex min-h-[44px] items-center gap-3 rounded px-2 text-soft"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded border border-line bg-surface-raised">
        <ImagenFavorito favorito={favorito} variante="fila" />
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{favorito.titulo}</span>
      <span className="truncate text-sm text-muted">{dominio}</span>
    </a>
  );
}

function BotonAbrirTodos({
  grupo,
  favoritos,
  pendiente,
  onAbrir,
}: {
  grupo: Grupo;
  favoritos: Favorito[] | undefined;
  pendiente: boolean;
  onAbrir: () => void;
}) {
  const listo = !pendiente && (favoritos?.length ?? 0) > 0;
  const texto = `Abrir los ${grupo.favoritos} enlaces de ${grupo.nombre} en pestañas nuevas`;

  return (
    <button
      type="button"
      onClick={onAbrir}
      disabled={!listo}
      title={texto}
      aria-label={texto}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded px-2 text-sm text-muted disabled:opacity-50"
    >
      <span>({grupo.favoritos})</span>
      <IconoAbrirTodos width={16} height={16} />
    </button>
  );
}

/** Sección de grupo solo presentación: cabecera, persiana y mosaicos de apertura. */
export function SeccionGrupo({
  grupo,
  modo,
  plegado,
  alternarPlegado,
}: {
  grupo: Grupo;
  modo: ModoEnlace;
  plegado: boolean;
  alternarPlegado: () => void;
}) {
  const favoritos = useBookmarks(grupo.id);
  const apertura = leerApertura();
  const listas = modo === "listas";
  const [aviso, setAviso] = useState<string | null>(null);

  function abrirTodos() {
    const lista = favoritos.data ?? [];
    let bloqueadas = 0;
    for (const favorito of lista) {
      const ventana = window.open(favorito.url, "_blank");
      if (ventana) {
        ventana.opener = null;
      } else {
        bloqueadas += 1;
      }
    }
    setAviso(
      bloqueadas > 0
        ? `El navegador bloqueó ${bloqueadas} de ${lista.length} pestañas. Permite las ventanas emergentes para este sitio y vuelve a intentarlo.`
        : null,
    );
  }

  return (
    <section
      aria-label={grupo.nombre}
      style={{
        borderLeftColor: grupo.color ?? undefined,
        borderLeftWidth: grupo.color ? 4 : undefined,
      }}
      className="rounded border border-line p-4"
    >
      <div className="flex min-h-[44px] w-full items-center gap-1">
        <button
          type="button"
          onClick={alternarPlegado}
          aria-expanded={!plegado}
          className="flex min-h-[44px] flex-1 items-center gap-2 text-left"
        >
          <span className={`inline-block transition-transform ${plegado ? "-rotate-90" : ""}`}>▾</span>
          <span className="flex-1 text-lg font-bold">{grupo.nombre}</span>
        </button>
        <BotonAbrirTodos grupo={grupo} favoritos={favoritos.data} pendiente={favoritos.isPending} onAbrir={abrirTodos} />
      </div>
      {aviso && (
        <p role="alert" className="mt-2 text-sm text-brand">
          {aviso}
        </p>
      )}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ${plegado ? "grid-rows-[0fr]" : "grid-rows-[1fr]"}`}
      >
        <div className="overflow-hidden">
          <div className={listas ? "mt-2 space-y-0.5" : "mt-3 flex flex-wrap gap-3"}>
            {favoritos.data?.map((f) =>
              listas ? (
                <FilaFavorito key={f.id} favorito={f} apertura={apertura} />
              ) : (
                <MosaicoFavorito
                  key={f.id}
                  favorito={f}
                  apertura={apertura}
                  onEditar={() => undefined}
                  onBorrar={() => undefined}
                  soloLectura
                />
              ),
            )}
            {favoritos.data?.length === 0 && (
              <p className="text-sm text-muted">Sin favoritos todavía.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
