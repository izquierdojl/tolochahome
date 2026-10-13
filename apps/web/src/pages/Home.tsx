import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

/** Desplazamiento horizontal (px) a partir del cual el gesto se considera arrastre y no toque. */
const UMBRAL_ARRASTRE_INICIO = 8;

/** Duración (ms) de las transiciones de deslizamiento; se publica en CSS como `--dur-deslizamiento`. */
const DURACION_DESLIZAMIENTO = 200;

/** Factor de resistencia al arrastrar hacia un extremo sin grupo contiguo. */
const RESISTENCIA_EXTREMO = 0.35;

/** ¿El sistema pide movimiento reducido? */
function prefiereMovimientoReducido(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
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
  // Arrastre y transición entre grupos (disposición «Barra»). El desplazamiento
  // se aplica al DOM sin re-renderizar para no repintar los favoritos en cada píxel.
  const panel = useRef<HTMLDivElement>(null);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const arrastrandoH = useRef(false);
  const suprimirClick = useRef(false);
  const temporizador = useRef<number | null>(null);
  const [fase, setFase] = useState<{ tipo: "reposo" | "saliendo" | "entrando"; signo: number }>({
    tipo: "reposo",
    signo: 1,
  });

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--dur-deslizamiento",
      `${DURACION_DESLIZAMIENTO}ms`,
    );
    return () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    };
  }, []);

  // Fases de la transición: el panel sale hacia un lado y el nuevo entra desde el contrario.
  useLayoutEffect(() => {
    const el = panel.current;
    if (!el) return;
    const ancho = el.offsetWidth || window.innerWidth;
    if (fase.tipo === "saliendo") {
      el.style.transition = `transform ${DURACION_DESLIZAMIENTO}ms ease-in`;
      void el.offsetWidth;
      el.style.transform = `translateX(${fase.signo * ancho}px)`;
    } else if (fase.tipo === "entrando") {
      el.style.transition = "none";
      el.style.transform = `translateX(${-fase.signo * ancho}px)`;
      void el.offsetWidth;
      el.style.transition = `transform ${DURACION_DESLIZAMIENTO}ms ease-out`;
      el.style.transform = "translateX(0px)";
    } else {
      el.style.transition = "";
      el.style.transform = "";
    }
  }, [fase]);

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

  function fijarDesplazamiento(px: number) {
    const el = panel.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.transform = `translateX(${px}px)`;
  }

  function rebotar() {
    const el = panel.current;
    if (!el || !el.style.transform) return;
    el.style.transition = `transform ${DURACION_DESLIZAMIENTO}ms ease-out`;
    void el.offsetWidth;
    el.style.transform = "translateX(0px)";
  }

  function iniciarCambio(signo: number, destinoId: string) {
    if (prefiereMovimientoReducido()) {
      seleccionarGrupo(destinoId);
      return;
    }
    if (temporizador.current !== null) window.clearTimeout(temporizador.current);
    setFase({ tipo: "saliendo", signo });
    temporizador.current = window.setTimeout(() => {
      seleccionarGrupo(destinoId);
      setFase({ tipo: "entrando", signo });
      temporizador.current = window.setTimeout(() => {
        setFase({ tipo: "reposo", signo });
        temporizador.current = null;
      }, DURACION_DESLIZAMIENTO);
    }, DURACION_DESLIZAMIENTO);
  }

  /** Cambio de grupo desde la barra: misma transición, con la dirección del orden de grupos. */
  function seleccionarGrupoAnimado(id: string) {
    if (!usuario || id === grupoActivo?.id) return;
    if (prefiereMovimientoReducido() || fase.tipo !== "reposo") {
      seleccionarGrupo(id);
      return;
    }
    const i = listaGrupos.findIndex((g) => g.id === grupoActivo?.id);
    const j = listaGrupos.findIndex((g) => g.id === id);
    if (i < 0 || j < 0 || i === j) {
      seleccionarGrupo(id);
      return;
    }
    iniciarCambio(j > i ? -1 : 1, id);
  }

  function toqueInicio(e: React.TouchEvent) {
    if (e.touches.length !== 1 || fase.tipo !== "reposo") {
      toque.current = null;
      arrastrandoH.current = false;
      return;
    }
    const t = e.touches[0];
    toque.current = { x: t.clientX, y: t.clientY };
    arrastrandoH.current = false;
  }

  function toqueMueve(e: React.TouchEvent) {
    if (fase.tipo !== "reposo" || prefiereMovimientoReducido()) return;
    const inicio = toque.current;
    if (!inicio) return;
    const t = e.touches[0];
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    if (!arrastrandoH.current) {
      if (Math.abs(dx) < UMBRAL_ARRASTRE_INICIO || Math.abs(dx) <= Math.abs(dy)) return;
      arrastrandoH.current = true;
    }
    const i = listaGrupos.findIndex((g) => g.id === grupoActivo?.id);
    const hayVecino = dx > 0 ? i > 0 : i < listaGrupos.length - 1;
    fijarDesplazamiento(hayVecino ? dx : dx * RESISTENCIA_EXTREMO);
  }

  function toqueFin(e: React.TouchEvent) {
    const inicio = toque.current;
    toque.current = null;
    const arrastro = arrastrandoH.current;
    arrastrandoH.current = false;
    if (fase.tipo !== "reposo" || !inicio || !grupoActivo) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - inicio.x;
    const dy = t.clientY - inicio.y;
    const horizontal = Math.abs(dx) > Math.abs(dy);
    if (listaGrupos.length >= 2 && horizontal && Math.abs(dx) >= UMBRAL_ARRASTRE) {
      const i = listaGrupos.findIndex((g) => g.id === grupoActivo.id);
      const j = dx > 0 ? i - 1 : i + 1;
      const destino = j >= 0 && j < listaGrupos.length ? listaGrupos[j] : undefined;
      suprimirClick.current = true;
      if (i >= 0 && destino) {
        iniciarCambio(dx > 0 ? 1 : -1, destino.id);
        return;
      }
    }
    if (arrastro) suprimirClick.current = true;
    rebotar();
  }

  function toqueCancelar() {
    toque.current = null;
    arrastrandoH.current = false;
    if (fase.tipo === "reposo") rebotar();
  }

  function capturarClick(e: React.MouseEvent) {
    if (suprimirClick.current) {
      suprimirClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
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
              onSeleccionar={seleccionarGrupoAnimado}
            />
          )}
          {grupoActivo && (
            <div
              className="deslizamiento-grupo overflow-hidden"
              style={{ touchAction: "pan-y" }}
              onTouchStart={toqueInicio}
              onTouchMove={toqueMueve}
              onTouchEnd={toqueFin}
              onTouchCancel={toqueCancelar}
              onClickCapture={capturarClick}
            >
              <div ref={panel} className="will-change-transform">
                <SeccionGrupo key={grupoActivo.id} grupo={grupoActivo} modo={modo} variante="barra" />
              </div>
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
