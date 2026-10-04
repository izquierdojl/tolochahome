import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth.js";
import { useGroups } from "../hooks/useGroups.js";
import { useMotores } from "../hooks/useBusqueda.js";
import { usePlegados } from "../hooks/usePlegados.js";
import { BarraBusqueda } from "../components/BarraBusqueda.js";
import { SeccionGrupo } from "../components/SeccionGrupo.js";
import { leerModo, type ModoEnlace } from "../components/MosaicoFavorito.js";
import { IconoDesplegar, IconoOjo, IconoOjoTachado, IconoPlegar } from "../components/Iconos.js";

function claveBusqueda(userId: string): string {
  return `tolochahome-busqueda-visible:${userId}`;
}

function leerBusquedaVisible(userId: string): boolean {
  try {
    return localStorage.getItem(claveBusqueda(userId)) !== "0";
  } catch {
    return true;
  }
}

function guardarBusquedaVisible(userId: string, visible: boolean) {
  try {
    localStorage.setItem(claveBusqueda(userId), visible ? "1" : "0");
  } catch {
    return;
  }
}

/** Portada: solo presentación. La gestión vive en `/gestion`. */
export function Home() {
  const estado = useAuthStore((s) => s.estado);
  const usuario = useAuthStore((s) => s.usuario);
  const grupos = useGroups();
  const motores = useMotores();
  const [modo] = useState<ModoEnlace>(() => leerModo());
  const [busquedaVisible, setBusquedaVisible] = useState<boolean>(() =>
    usuario ? leerBusquedaVisible(usuario.id) : true,
  );
  const idsGrupos = (grupos.data ?? []).map((g) => g.id);
  const plegados = usePlegados(usuario?.id ?? "", idsGrupos);

  function alternarBusqueda() {
    if (!usuario) return;
    const siguiente = !busquedaVisible;
    setBusquedaVisible(siguiente);
    guardarBusquedaVisible(usuario.id, siguiente);
  }

  if (estado !== "autenticada" || !usuario) {
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">TolochaHome</h1>
          <p className="text-muted">Tu página principal: grupos, favoritos y búsqueda directa.</p>
        </div>
        {estado === "anonima" && (
          <p className="space-x-4">
            <Link to="/login" className="font-bold text-brand">
              Entrar
            </Link>
            <Link to="/registro" className="text-soft">
              Crear cuenta
            </Link>
          </p>
        )}
      </div>
    );
  }

  const enCarpetas = modo === "carpetas";
  const hayBarra = (motores.data?.length ?? 0) > 0;
  const conPlegado = enCarpetas && idsGrupos.length > 0;
  const textoPlegado = plegados.todoPlegado
    ? "Desplegar todas las secciones"
    : "Plegar todas las secciones";

  const botonPlegado = conPlegado && (
    <button
      type="button"
      onClick={plegados.todoPlegado ? plegados.desplegarTodos : plegados.plegarTodos}
      aria-expanded={!plegados.todoPlegado}
      title={textoPlegado}
      aria-label={textoPlegado}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted"
    >
      {plegados.todoPlegado ? <IconoDesplegar /> : <IconoPlegar />}
    </button>
  );

  return (
    <div className="space-y-4">
      {busquedaVisible && (
        <div className="mx-auto flex w-full max-w-xl items-center gap-1">
          <div className="flex items-center gap-1">
            {botonPlegado}
            <button
              type="button"
              onClick={alternarBusqueda}
              aria-pressed={busquedaVisible}
              title="Ocultar la barra de búsqueda"
              aria-label="Ocultar la barra de búsqueda"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted"
            >
              <IconoOjoTachado />
            </button>
          </div>
          {hayBarra && <BarraBusqueda motores={motores.data!} />}
        </div>
      )}
      {!busquedaVisible && (
        <div className="mx-auto w-full max-w-xl">
          <div className="flex items-center gap-1">
            {botonPlegado}
            <button
              type="button"
              onClick={alternarBusqueda}
              aria-pressed={busquedaVisible}
              title="Mostrar la barra de búsqueda"
              aria-label="Mostrar la barra de búsqueda"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted"
            >
              <IconoOjo />
            </button>
          </div>
        </div>
      )}
      {grupos.isPending && <p className="text-muted">Cargando…</p>}
      {(grupos.data ?? []).map((g) => (
        <SeccionGrupo
          key={g.id}
          grupo={g}
          modo={modo}
          plegado={plegados.plegados.has(g.id)}
          alternarPlegado={() => plegados.alternar(g.id)}
        />
      ))}
      {(grupos.data ?? []).length === 0 && !grupos.isPending && (
        <p className="text-center text-muted">
          Aún no tienes grupos. Créalos en <Link to="/gestion" className="text-brand">Gestión</Link>.
        </p>
      )}
    </div>
  );
}
