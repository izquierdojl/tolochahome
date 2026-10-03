import { useState } from "react";
import type { Grupo } from "../hooks/useGroups.js";
import { useBookmarks } from "../hooks/useBookmarks.js";
import { MosaicoFavorito, leerApertura } from "../components/MosaicoFavorito.js";

function clavePlegados(userId: string): string {
  return `tolochahome-plegados:${userId}`;
}

function leerPlegados(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(clavePlegados(userId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function usePlegado(userId: string, groupId: string): [boolean, () => void] {
  const [plegados, setPlegados] = useState<Set<string>>(() => leerPlegados(userId));
  const plegado = plegados.has(groupId);
  function alternar() {
    setPlegados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(groupId)) siguiente.delete(groupId);
      else siguiente.add(groupId);
      localStorage.setItem(clavePlegados(userId), JSON.stringify([...siguiente]));
      return siguiente;
    });
  }
  return [plegado, alternar];
}

/** Sección de grupo solo presentación: cabecera, persiana y mosaicos de apertura. */
export function SeccionGrupo({ grupo, userId }: { grupo: Grupo; userId: string }) {
  const favoritos = useBookmarks(grupo.id);
  const [plegado, alternarPlegado] = usePlegado(userId, grupo.id);
  const apertura = leerApertura();

  return (
    <section
      aria-label={grupo.nombre}
      style={{
        borderLeftColor: grupo.color ?? undefined,
        borderLeftWidth: grupo.color ? 4 : undefined,
      }}
      className="rounded border border-line p-4"
    >
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
      <div
        className={`grid transition-[grid-template-rows] duration-300 ${plegado ? "grid-rows-[0fr]" : "grid-rows-[1fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="mt-3 flex flex-wrap gap-3">
            {favoritos.data?.map((f) => (
              <MosaicoFavorito
                key={f.id}
                favorito={f}
                apertura={apertura}
                onEditar={() => undefined}
                onBorrar={() => undefined}
                soloLectura
              />
            ))}
            {favoritos.data?.length === 0 && (
              <p className="text-sm text-muted">Sin favoritos todavía.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
