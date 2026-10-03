import { useEffect, useState } from "react";
import type { Favorito } from "../hooks/useBookmarks.js";
import { useAuthStore } from "../stores/auth.js";
import { useRegistrarVisita } from "../hooks/useBookmarks.js";

export type Apertura = "misma" | "nueva";
const CLAVE_APERTURA = "tolochahome-apertura";

export function leerApertura(): Apertura {
  return localStorage.getItem(CLAVE_APERTURA) === "misma" ? "misma" : "nueva";
}

/** Inicial de respaldo cuando ni la imagen ni el favicon cargan. */
function inicial(titulo: string): string {
  const letra = titulo.trim().charAt(0);
  return letra ? letra.toUpperCase() : "?";
}

export function dominioDe(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Las imágenes privadas no pueden ir en `<img src>` (llevarían sin Bearer):
 * se descargan con el token y se muestran como object URL.
 */
function useImagenPrivada(nombre: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!nombre) {
      setUrl(null);
      return;
    }
    let viva = true;
    let objeto: string | null = null;
    const token = useAuthStore.getState().accessToken;
    fetch(`/api/v1/imagenes/${nombre}`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (viva && blob) {
          objeto = URL.createObjectURL(blob);
          setUrl(objeto);
        }
      })
      .catch(() => undefined);
    return () => {
      viva = false;
      if (objeto) URL.revokeObjectURL(objeto);
    };
  }, [nombre]);
  return url;
}

export function MosaicoFavorito({
  favorito,
  apertura,
  onEditar,
  onBorrar,
}: {
  favorito: Favorito;
  apertura: Apertura;
  onEditar: () => void;
  onBorrar: () => void;
}) {
  const [sinFavicon, setSinFavicon] = useState(false);
  const registrarVisita = useRegistrarVisita();
  const imagenPropia = useImagenPrivada(favorito.imagen);
  const dominio = dominioDe(favorito.url);

  function abrir(e: React.MouseEvent) {
    // La gestión (editar/borrar) vive en botones propios; el mosaico abre.
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    registrarVisita.mutate(favorito.id);
    window.open(favorito.url, apertura === "nueva" ? "_blank" : "_self", "noopener");
  }

  return (
    <div className="w-28 shrink-0">
      <a
        href={favorito.url}
        title={`${favorito.titulo} — ${dominio}`}
        onClick={abrir}
        className="flex h-20 items-center justify-center overflow-hidden rounded border border-line bg-surface-raised"
      >
        {imagenPropia ? (
          <img src={imagenPropia} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : !sinFavicon ? (
          <img
            src={`https://${dominio}/favicon.ico`}
            alt=""
            loading="lazy"
            width={32}
            height={32}
            onError={() => setSinFavicon(true)}
          />
        ) : (
          <span aria-hidden className="text-3xl font-bold text-brand">
            {inicial(favorito.titulo)}
          </span>
        )}
      </a>
      <p className="mt-1 truncate text-center text-xs text-soft">{favorito.titulo}</p>
      <p className="truncate text-center text-xs text-muted">{dominio}</p>
      <div className="mt-1 flex justify-center gap-2 text-xs">
        <button type="button" onClick={onEditar} className="text-soft min-h-[44px] px-1">
          Editar
        </button>
        <button type="button" onClick={onBorrar} className="text-muted min-h-[44px] px-1">
          Borrar
        </button>
      </div>
    </div>
  );
}
