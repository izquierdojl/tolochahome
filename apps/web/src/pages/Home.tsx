import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth.js";
import { useGroups, type Grupo } from "../hooks/useGroups.js";
import { useMotores } from "../hooks/useBusqueda.js";
import { usePlegados } from "../hooks/usePlegados.js";
import { useCrearFavorito, usePrevisualizar } from "../hooks/useBookmarks.js";
import { esApiError } from "../lib/api.js";
import { BarraBusqueda } from "../components/BarraBusqueda.js";
import { BarraGrupos } from "../components/BarraGrupos.js";
import { SeccionFrecuentes, SeccionGrupo } from "../components/SeccionGrupo.js";
import { dominioDe } from "../components/ImagenFavorito.js";
import {
  leerDisposicion,
  leerModo,
  type DisposicionGrupos,
  type ModoEnlace,
} from "../components/MosaicoFavorito.js";
import {
  IconoDesplegar,
  IconoGuardar,
  IconoMas,
  IconoOjo,
  IconoOjoTachado,
  IconoPlegar,
  IconoX,
} from "../components/Iconos.js";

function normalizarUrlEnlace(valor: string): string {
  const entrada = valor.trim();
  if (!entrada) throw new Error("Introduce una URL.");

  const tieneEsquemaWeb = /^https?:\/\//i.test(entrada);
  const esquemaNoWeb = /^[a-z][a-z\d+.-]*:(?!\d+(?:\/|$))/i.test(entrada);
  const normalizada = tieneEsquemaWeb || esquemaNoWeb ? entrada : `https://${entrada}`;

  let url: URL;
  try {
    url = new URL(normalizada);
  } catch {
    throw new Error("La URL no es válida.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("La URL debe usar http o https.");
  }
  const hostValido =
    url.hostname.includes(".") ||
    url.hostname.toLowerCase() === "localhost" ||
    /^\[[\da-f:.]+\]$/i.test(url.hostname) ||
    /^\d+(?:\.\d+){3}$/.test(url.hostname);
  if (!hostValido) throw new Error("Introduce un dominio válido, como ejemplo.com.");
  return url.toString();
}

function FormularioEnlaceRapido({
  grupos,
  grupoInicial,
  guardando,
  onGuardar,
  onCerrar,
}: {
  grupos: Grupo[];
  grupoInicial: string;
  guardando: boolean;
  onGuardar: (url: string, groupId: string) => Promise<void>;
  onCerrar: () => void;
}) {
  const [url, setUrl] = useState("");
  const [grupo, setGrupo] = useState(grupoInicial);
  const [error, setError] = useState<string | null>(null);
  const campoUrl = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campoUrl.current?.focus();
  }, []);

  useEffect(() => {
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [guardando, onCerrar]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let urlNormalizada: string;
    try {
      urlNormalizada = normalizarUrlEnlace(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "La URL no es válida.");
      return;
    }
    try {
      await onGuardar(urlNormalizada, grupo);
    } catch (err) {
      setError(
        esApiError(err)
          ? err.mensaje
          : err instanceof Error
            ? err.message
            : "No se pudo guardar el enlace.",
      );
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-wrap items-center gap-2" aria-label="Añadir enlace rápido">
      <input
        ref={campoUrl}
        type="text"
        inputMode="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Dirección web…"
        aria-label="URL del enlace"
        aria-invalid={Boolean(error)}
        autoComplete="url"
        required
        className="min-h-[44px] min-w-40 flex-1 rounded border border-line bg-surface px-3 py-2"
      />
      <select
        value={grupo}
        onChange={(e) => setGrupo(e.target.value)}
        aria-label="Grupo del enlace"
        className="min-h-[44px] min-w-32 flex-1 rounded border border-line bg-surface px-2 py-2"
      >
        {grupos.map((g) => (
          <option key={g.id} value={g.id}>{g.nombre}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={guardando || !url.trim()}
        title="Guardar enlace"
        aria-label="Guardar enlace"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-brand disabled:opacity-50"
      >
        <IconoGuardar />
      </button>
      <button
        type="button"
        onClick={onCerrar}
        title="Cancelar"
        aria-label="Cancelar alta de enlace"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted"
      >
        <IconoX />
      </button>
      {error && <p role="alert" className="w-full text-sm text-ochre-600">{error}</p>}
    </form>
  );
}

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

/** Id reservado de la sección «Frecuentes»: no colisiona con el UUID de un grupo. */
const ID_FRECUENTES = "__frecuentes";

/** Pestaña sintética de «Frecuentes» para la barra de grupos. */
const PESTANA_FRECUENTES: Grupo = {
  id: ID_FRECUENTES,
  nombre: "Frecuentes",
  orden: -1,
  favoritos: 0,
  color: null,
};

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
  const crearFavorito = useCrearFavorito();
  const previsualizar = usePrevisualizar();
  const [altaRapidaAbierta, setAltaRapidaAbierta] = useState(false);
  const [modo] = useState<ModoEnlace>(() => leerModo());
  const [disposicion] = useState<DisposicionGrupos>(() => leerDisposicion());
  const [busquedaVisible, setBusquedaVisible] = useState<boolean>(() =>
    usuario ? leerBusquedaVisible(usuario.id) : true,
  );
  const idsGrupos = (grupos.data ?? []).map((g) => g.id);
  const idsSecciones = [ID_FRECUENTES, ...idsGrupos];
  const plegados = usePlegados(usuario?.id ?? "", idsSecciones);
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
  const pestanas = [PESTANA_FRECUENTES, ...listaGrupos];
  const grupoActivo = pestanas.find((g) => g.id === activo.id) ?? pestanas[0];
  const grupoInicialRapido =
    enBarra && grupoActivo?.id !== ID_FRECUENTES
      ? grupoActivo?.id ?? listaGrupos[0]?.id ?? ""
      : listaGrupos[0]?.id ?? "";
  const hayBarra = (motores.data?.length ?? 0) > 0;
  const conPlegado = enCarpetas && !enBarra && idsSecciones.length > 0;
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

  async function guardarEnlaceRapido(url: string, groupId: string) {
    let titulo: string | null = null;
    let imagen: string | undefined;
    try {
      const vista = await previsualizar.mutateAsync(url);
      titulo = vista.titulo?.trim() || null;
      if (titulo) imagen = vista.imagen ?? undefined;
    } catch {
      // La previsualización es opcional: se puede crear usando dominio y favicon.
    }
    titulo = titulo?.slice(0, 150) ?? dominioDe(url).slice(0, 150);
    await crearFavorito.mutateAsync({
      groupId,
      titulo,
      url,
      ...(imagen ? { imagen } : {}),
    });
    setAltaRapidaAbierta(false);
  }

  function cerrarAltaRapida() {
    setAltaRapidaAbierta(false);
  }

  const botonAltaRapida = listaGrupos.length > 0 && (
    <button
      type="button"
      onClick={() => setAltaRapidaAbierta((abierta) => !abierta)}
      aria-expanded={altaRapidaAbierta}
      aria-controls="formulario-enlace-rapido"
      title="Añadir enlace rápido"
      aria-label="Añadir enlace rápido"
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-brand"
    >
      <IconoMas />
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
    const i = pestanas.findIndex((g) => g.id === grupoActivo?.id);
    const j = pestanas.findIndex((g) => g.id === id);
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
    const i = pestanas.findIndex((g) => g.id === grupoActivo?.id);
    const hayVecino = dx > 0 ? i > 0 : i < pestanas.length - 1;
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
    if (pestanas.length >= 2 && horizontal && Math.abs(dx) >= UMBRAL_ARRASTRE) {
      const i = pestanas.findIndex((g) => g.id === grupoActivo.id);
      const j = dx > 0 ? i - 1 : i + 1;
      const destino = j >= 0 && j < pestanas.length ? pestanas[j] : undefined;
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
            {botonAltaRapida}
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
            {botonAltaRapida}
          </div>
        </div>
      )}
      {altaRapidaAbierta && listaGrupos.length > 0 && (
        <div id="formulario-enlace-rapido" className="mx-auto w-full max-w-xl rounded border border-line bg-surface-raised p-3">
          <FormularioEnlaceRapido
            grupos={listaGrupos}
            grupoInicial={grupoInicialRapido}
            guardando={previsualizar.isPending || crearFavorito.isPending}
            onGuardar={guardarEnlaceRapido}
            onCerrar={cerrarAltaRapida}
          />
        </div>
      )}
      {grupos.isPending && <p className="text-muted">Cargando…</p>}
      {enBarra ? (
        <>
          {pestanas.length > 0 && (
            <BarraGrupos
              grupos={pestanas}
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
                {grupoActivo.id === ID_FRECUENTES ? (
                  <SeccionFrecuentes key={ID_FRECUENTES} modo={modo} variante="barra" />
                ) : (
                  <SeccionGrupo key={grupoActivo.id} grupo={grupoActivo} modo={modo} variante="barra" />
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <SeccionFrecuentes
            modo={modo}
            plegado={plegados.plegados.has(ID_FRECUENTES)}
            alternarPlegado={() => plegados.alternar(ID_FRECUENTES)}
          />
          {listaGrupos.map((g) => (
            <SeccionGrupo
              key={g.id}
              grupo={g}
              modo={modo}
              plegado={plegados.plegados.has(g.id)}
              alternarPlegado={() => plegados.alternar(g.id)}
            />
          ))}
        </>
      )}
      {(grupos.data ?? []).length === 0 && !grupos.isPending && (
        <p className="text-center text-muted">
          Aún no tienes grupos. Créalos en <Link to="/gestion" className="text-brand">Gestión</Link>.
        </p>
      )}
    </div>
  );
}
