import { useState } from "react";
import type { Favorito } from "../hooks/useBookmarks.js";
import { useRegistrarVisita } from "../hooks/useBookmarks.js";
import { ImagenFavorito, dominioDe } from "./ImagenFavorito.js";

export type Apertura = "misma" | "nueva";
const CLAVE_APERTURA = "tolochahome-apertura";

export function leerApertura(): Apertura {
  return localStorage.getItem(CLAVE_APERTURA) === "misma" ? "misma" : "nueva";
}

export type TamanoEnlace = "xs" | "s" | "m" | "l" | "xl";
const CLAVE_TAMANO = "tolochahome-tamano-enlaces";

export type ModoEnlace = "carpetas" | "listas";
const CLAVE_MODO = "tolochahome-modo-enlaces";

export function leerModo(): ModoEnlace {
  return localStorage.getItem(CLAVE_MODO) === "listas" ? "listas" : "carpetas";
}

export function guardarModo(v: ModoEnlace): void {
  localStorage.setItem(CLAVE_MODO, v);
}

export const TAMANOS_ENLACE: { valor: TamanoEnlace; etiqueta: string }[] = [
  { valor: "xs", etiqueta: "Muy pequeño" },
  { valor: "s", etiqueta: "Pequeño" },
  { valor: "m", etiqueta: "Mediano" },
  { valor: "l", etiqueta: "Grande" },
  { valor: "xl", etiqueta: "Muy grande" },
];

export function leerTamano(): TamanoEnlace {
  const v = localStorage.getItem(CLAVE_TAMANO);
  return v === "xs" || v === "s" || v === "m" || v === "l" || v === "xl" ? v : "m";
}

export function guardarTamano(v: TamanoEnlace): void {
  localStorage.setItem(CLAVE_TAMANO, v);
}

/** Anchura del mosaico y altura de la imagen por nivel (`m` = tamaño actual). */
const CLASES_TAMANO: Record<TamanoEnlace, { caja: string; imagen: string }> = {
  xs: { caja: "w-20", imagen: "h-14" },
  s: { caja: "w-24", imagen: "h-16" },
  m: { caja: "w-28", imagen: "h-20" },
  l: { caja: "w-32", imagen: "h-24" },
  xl: { caja: "w-36", imagen: "h-28" },
};

import { IconoLapiz, IconoPapelera } from "./Iconos.js";

export function MosaicoFavorito({
  favorito,
  apertura,
  onEditar,
  onBorrar,
  soloLectura = false,
}: {
  favorito: Favorito;
  apertura: Apertura;
  onEditar: () => void;
  onBorrar: () => void;
  soloLectura?: boolean;
}) {
  const registrarVisita = useRegistrarVisita();
  const dominio = dominioDe(favorito.url);
  const [tamano] = useState<TamanoEnlace>(() => leerTamano());
  const clases = CLASES_TAMANO[tamano];

  function abrir(e: React.MouseEvent) {
    // La gestión (editar/borrar) vive en botones propios; el mosaico abre.
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    registrarVisita.mutate(favorito.id);
    window.open(favorito.url, apertura === "nueva" ? "_blank" : "_self", "noopener");
  }

  return (
    <div className={`${clases.caja} shrink-0`}>
      <a
        href={favorito.url}
        title={`${favorito.titulo} — ${dominio}`}
        onClick={abrir}
        className={`flex ${clases.imagen} items-center justify-center overflow-hidden rounded border border-line bg-surface-raised`}
      >
        <ImagenFavorito favorito={favorito} variante="mosaico" />
      </a>
      <p className="mt-1 truncate text-center text-xs text-soft">{favorito.titulo}</p>
      <p className="truncate text-center text-xs text-muted">{dominio}</p>
      {!soloLectura && (
        <div className="mt-1 flex justify-center gap-1 text-xs">
          <button
            type="button"
            onClick={onEditar}
            title={`Editar ${favorito.titulo}`}
            aria-label={`Editar ${favorito.titulo}`}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-soft"
          >
            <IconoLapiz />
          </button>
          <button
            type="button"
            onClick={onBorrar}
            title={`Borrar ${favorito.titulo}`}
            aria-label={`Borrar ${favorito.titulo}`}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted"
          >
            <IconoPapelera />
          </button>
        </div>
      )}
    </div>
  );
}
