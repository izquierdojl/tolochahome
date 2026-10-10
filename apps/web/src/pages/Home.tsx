import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth.js";
import { useGroups } from "../hooks/useGroups.js";
import { useMotores } from "../hooks/useBusqueda.js";
import { usePlegados } from "../hooks/usePlegados.js";
import { BarraBusqueda } from "../components/BarraBusqueda.js";
import { BarraGrupos } from "../components/BarraGrupos.js";
import { SeccionGrupo } from "../components/SeccionGrupo.js";
import {
  leerDisposicion,
  leerModo,
  type DisposicionGrupos,
  type ModoEnlace,
} from "../components/MosaicoFavorito.js";
import { IconoDesplegar, IconoOjo, IconoOjoTachado, IconoPlegar } from "../components/Iconos.js";

function claveBusqueda(userId: string): string {
  return `tolochahome-busqueda-visible:${userId}`;
}

/** Desplazamiento horizontal mínimo (px) para que un arrastre táctil cambie de grupo. */
const UMBRAL_ARRASTRE = 50;

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

function claveGrupoActivo(userId: string): string {
  return `tolochahome-grupo-activo:${userId}`;
}

function leerGrupoActivo(userId: string): string | null {
  try {
    return localStorage.getItem(claveGrupoActivo(userId));
  } catch {
    return null;
  }
}

function guardarGrupoActivo(userId: string, id: string) {
  try {
    localStorage.setItem(claveGrupoActivo(userId), id);
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
  const [disposicion] = useState<DisposicionGrupos>(() => leerDisposicion());
  const [busquedaVisible, setBusquedaVisible] = useState<boolean>(() =>
    usuario ? leerBusquedaVisible(usuario.id) : true,
  );
  const idsGrupos = (grupos.data ?? []).map((g) => g.id);
  const plegados = usePlegados(usuario?.id ?? "", idsGrupos);
  // La portada monta antes de restaurar la sesión: ajusta el grupo activo al aparecer el usuario.
  const [activo, setActivo] = useState<{ userId: string; id: string | null }>(() => ({
    userId: usuario?.id ?? "",
    id: usuario ? leerGrupoActivo(usuario.id) : null,
  }));
  const idUsuario = usuario?.id ?? "";
  if (activo.userId !== idUsuario) {
    setActivo({ userId: idUsuario, id: idUsuario ? leerGrupoActivo(idUsuario) : null });
  }
  const toque = useRef<{ x: number; y: number } | null>(null);

  function seleccionarGrupo(id: string) {
    if (!usuario) return;
    setActivo({ userId: usuario.id, id });
    guardarGrupoActivo(usuario.id, id);
  }

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
  const enBarra = disposicion === "barra";
  const listaGrupos = grupos.data ?? [];
  const grupoActivo = listaGrupos.find((g) => g.id === activo.id) ?? listaGrupos[0];
  const hayBarra = (motores.data?.length ?? 0) > 0;
  const conPlegado = enCarpetas && !enBarra && idsGrupos.length > 0;
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

  function toqueInicio(e: React.TouchEvent) {
    if (e.touches.length !== 1) {
      toque.current = null;
      return;
    }
    const t = e.touches[0];
    toque.current = { x: t.clientX, y: t.clientY };
  }

  function toqueFin(e: React.TouchEvent) {
    const inicio = toque.current;
    toque.current = null;
    if (!inicio || !grupoActivo || listaGrupos.length < 2) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    if (Math.abs(dx) < UMBRAL_ARRASTRE || Math.abs(dx) <= Math.abs(dy)) return;
    const i = listaGrupos.findIndex((g) => g.id === grupoActivo.id);
    if (i < 0) return;
    const j = dx > 0 ? i - 1 : i + 1;
    if (j < 0 || j >= listaGrupos.length) return;
    const destino = listaGrupos[j];
    if (destino) seleccionarGrupo(destino.id);
  }

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
      {enBarra ? (
        <>
          {listaGrupos.length > 0 && (
            <BarraGrupos
              grupos={listaGrupos}
              activoId={grupoActivo?.id}
              onSeleccionar={seleccionarGrupo}
            />
          )}
          {grupoActivo && (
            <div
              onTouchStart={toqueInicio}
              onTouchEnd={toqueFin}
              style={{ touchAction: "pan-y" }}
            >
              <SeccionGrupo key={grupoActivo.id} grupo={grupoActivo} modo={modo} variante="barra" />
            </div>
          )}
        </>
      ) : (
        listaGrupos.map((g) => (
          <SeccionGrupo
            key={g.id}
            grupo={g}
            modo={modo}
            plegado={plegados.plegados.has(g.id)}
            alternarPlegado={() => plegados.alternar(g.id)}
          />
        ))
      )}
      {(grupos.data ?? []).length === 0 && !grupos.isPending && (
        <p className="text-center text-muted">
          Aún no tienes grupos. Créalos en <Link to="/gestion" className="text-brand">Gestión</Link>.
        </p>
      )}
    </div>
  );
}
