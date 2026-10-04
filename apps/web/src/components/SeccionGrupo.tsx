import type { Grupo } from "../hooks/useGroups.js";
import type { Favorito } from "../hooks/useBookmarks.js";
import { useBookmarks, useRegistrarVisita } from "../hooks/useBookmarks.js";
import { MosaicoFavorito, leerApertura, dominioDe, type ModoEnlace, type Apertura } from "../components/MosaicoFavorito.js";

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
      <span className="min-w-0 flex-1 truncate font-medium">{favorito.titulo}</span>
      <span className="truncate text-sm text-muted">{dominio}</span>
    </a>
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

  return (
    <section
      aria-label={grupo.nombre}
      style={{
        borderLeftColor: grupo.color ?? undefined,
        borderLeftWidth: grupo.color ? 4 : undefined,
      }}
      className="rounded border border-line p-4"
    >
      {listas ? (
        <h2 className="text-lg font-bold">{grupo.nombre}</h2>
      ) : (
        <button
          type="button"
          onClick={alternarPlegado}
          aria-expanded={!plegado}
          className="flex min-h-[44px] w-full items-center gap-2 text-left"
        >
          <span className={`inline-block transition-transform ${plegado ? "-rotate-90" : ""}`}>▾</span>
          <span className="flex-1 text-lg font-bold">{grupo.nombre}</span>
          <span className="text-sm font-normal text-muted">({grupo.favoritos})</span>
        </button>
      )}
      <div
        className={
          listas
            ? "mt-2"
            : `grid transition-[grid-template-rows] duration-300 ${plegado ? "grid-rows-[0fr]" : "grid-rows-[1fr]"}`
        }
      >
        <div className={listas ? "" : "overflow-hidden"}>
          <div className={listas ? "space-y-0.5" : "mt-3 flex flex-wrap gap-3"}>
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
