import { useEffect, useState } from "react";
import type { Favorito } from "../hooks/useBookmarks.js";
import { useAuthStore } from "../stores/auth.js";

export function dominioDe(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/** Inicial de respaldo cuando ni la imagen ni el favicon cargan. */
function inicial(titulo: string): string {
  const letra = titulo.trim().charAt(0);
  return letra ? letra.toUpperCase() : "?";
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

export type VarianteImagen = "mosaico" | "fila";

/** Clases por contexto: el mosaico conserva su aspecto y la fila encaja en su miniatura. */
const CLASES: Record<VarianteImagen, { propia: string; favicon: string; inicial: string }> = {
  mosaico: {
    propia: "h-full w-full object-cover",
    favicon: "",
    inicial: "text-3xl font-bold text-brand",
  },
  fila: {
    propia: "h-full w-full object-cover",
    favicon: "h-full w-full object-contain p-0.5",
    inicial: "text-sm font-bold text-brand",
  },
};

/** Imagen de un favorito: imagen propia, favicon del sitio o letra inicial de respaldo. */
export function ImagenFavorito({
  favorito,
  variante,
}: {
  favorito: Favorito;
  variante: VarianteImagen;
}) {
  const [sinFavicon, setSinFavicon] = useState(false);
  const imagenPropia = useImagenPrivada(favorito.imagen);
  const dominio = dominioDe(favorito.url);
  const clases = CLASES[variante];

  if (imagenPropia) {
    return <img src={imagenPropia} alt="" loading="lazy" className={clases.propia} />;
  }
  if (!sinFavicon) {
    return (
      <img
        src={`https://${dominio}/favicon.ico`}
        alt=""
        loading="lazy"
        width={32}
        height={32}
        className={clases.favicon || undefined}
        onError={() => setSinFavicon(true)}
      />
    );
  }
  return (
    <span aria-hidden className={clases.inicial}>
      {inicial(favorito.titulo)}
    </span>
  );
}
