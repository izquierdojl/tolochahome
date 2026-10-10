import { useEffect, useRef } from "react";
import type { Grupo } from "../hooks/useGroups.js";

/** Barra horizontal de grupos (tablist accesible) para la portada en disposición «Barra». */
export function BarraGrupos({
  grupos,
  activoId,
  onSeleccionar,
}: {
  grupos: Grupo[];
  activoId: string | undefined;
  onSeleccionar: (id: string) => void;
}) {
  const pestanas = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    if (activoId) {
      pestanas.current.get(activoId)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [activoId]);

  function enfocar(g: Grupo) {
    onSeleccionar(g.id);
    pestanas.current.get(g.id)?.focus();
  }

  function teclado(e: React.KeyboardEvent) {
    const i = grupos.findIndex((g) => g.id === activoId);
    if (i < 0) return;
    let j: number;
    if (e.key === "ArrowRight") j = i + 1;
    else if (e.key === "ArrowLeft") j = i - 1;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = grupos.length - 1;
    else return;
    if (j < 0 || j >= grupos.length) return;
    e.preventDefault();
    const destino = grupos[j];
    if (destino) enfocar(destino);
  }

  return (
    <div
      role="tablist"
      aria-label="Grupos"
      onKeyDown={teclado}
      className="flex gap-1 overflow-x-auto border-b border-line"
    >
      {grupos.map((g) => {
        const activa = g.id === activoId;
        return (
          <button
            key={g.id}
            ref={(el) => {
              if (el) pestanas.current.set(g.id, el);
              else pestanas.current.delete(g.id);
            }}
            type="button"
            role="tab"
            id={`pestana-${g.id}`}
            aria-selected={activa}
            aria-controls={activa ? "panel-grupo-activo" : undefined}
            tabIndex={activa ? 0 : -1}
            onClick={() => onSeleccionar(g.id)}
            style={activa && g.color ? { borderBottomColor: g.color } : undefined}
            className={`min-h-[44px] shrink-0 whitespace-nowrap rounded-t border-b-2 px-3 ${
              activa
                ? `${g.color ? "" : "border-brand"} font-bold text-soft`
                : "border-transparent text-muted hover:text-soft"
            }`}
          >
            {g.nombre}
          </button>
        );
      })}
    </div>
  );
}
