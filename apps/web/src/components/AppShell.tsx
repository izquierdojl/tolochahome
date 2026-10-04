import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSesion } from "../hooks/useSesion.js";
import { useTiempo } from "../hooks/useTiempo.js";
import { useEditarCiudad } from "../hooks/useCiudades.js";
import { useAuthStore } from "../stores/auth.js";
import { aplicarTema, leerTema, type Tema } from "../lib/tema.js";
import { condicion, claveIcono } from "../lib/tiempo.js";
import { PanelTiempo } from "./PanelTiempo.js";
import {
  IconoAuto,
  IconoConfig,
  IconoGestion,
  IconoInfo,
  IconoLuna,
  IconoMenu,
  IconoSalir,
  IconoSol,
  IconoTiempo,
  IconoUsuario,
} from "./Iconos.js";

const ORDEN_TEMAS: Tema[] = ["auto", "light", "dark"];
const ICONO_TEMA = {
  auto: { icono: <IconoAuto />, etiqueta: "Tema automático" },
  light: { icono: <IconoSol />, etiqueta: "Tema claro" },
  dark: { icono: <IconoLuna />, etiqueta: "Tema oscuro" },
} as const;

function claseEnlace(activo: boolean): string {
  return `flex min-h-[44px] min-w-[44px] items-center justify-center rounded ${
    activo ? "text-brand" : "text-muted"
  }`;
}

function claseFila(activo: boolean): string {
  return `flex min-h-[44px] w-full items-center gap-3 rounded px-3 text-left ${
    activo ? "font-bold text-brand" : "text-soft"
  }`;
}

export function AppShell() {
  const { estado } = useSesion();
  const salir = useAuthStore((s) => s.salir);
  const navegar = useNavigate();
  const [tema, setTema] = useState<Tema>(() => leerTema());
  const [menuAbierto, setMenuAbierto] = useState(false);
  const botonMenu = useRef<HTMLButtonElement>(null);
  const panelMenu = useRef<HTMLDivElement>(null);
  const [tiempoAbierto, setTiempoAbierto] = useState(false);
  const botonTiempo = useRef<HTMLButtonElement>(null);
  const panelTiempo = useRef<HTMLDivElement>(null);
  const tiempo = useTiempo();
  const editarCiudad = useEditarCiudad();
  const listaTiempo = tiempo.data ?? [];
  const tiempoPorDefecto = listaTiempo.find((t) => t.ciudad.porDefecto) ?? listaTiempo[0];
  const autenticada = estado === "autenticada";

  function siguienteTema() {
    const siguiente = ORDEN_TEMAS[(ORDEN_TEMAS.indexOf(tema) + 1) % ORDEN_TEMAS.length];
    setTema(siguiente);
    aplicarTema(siguiente);
  }

  function cerrarMenu(devolverFoco: boolean) {
    setMenuAbierto(false);
    if (devolverFoco) botonMenu.current?.focus();
  }

  function cerrarTiempo(devolverFoco: boolean) {
    setTiempoAbierto(false);
    if (devolverFoco) botonTiempo.current?.focus();
  }

  useEffect(() => {
    if (!menuAbierto) return;
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") cerrarMenu(true);
    }
    function fuera(e: MouseEvent) {
      const objetivo = e.target as Node;
      if (!panelMenu.current?.contains(objetivo) && !botonMenu.current?.contains(objetivo)) {
        cerrarMenu(false);
      }
    }
    document.addEventListener("keydown", tecla);
    document.addEventListener("mousedown", fuera);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("mousedown", fuera);
    };
  }, [menuAbierto]);

  useEffect(() => {
    if (!tiempoAbierto) return;
    function tecla(e: KeyboardEvent) {
      if (e.key === "Escape") cerrarTiempo(true);
    }
    function fuera(e: MouseEvent) {
      const objetivo = e.target as Node;
      if (!panelTiempo.current?.contains(objetivo) && !botonTiempo.current?.contains(objetivo)) {
        cerrarTiempo(false);
      }
    }
    document.addEventListener("keydown", tecla);
    document.addEventListener("mousedown", fuera);
    return () => {
      document.removeEventListener("keydown", tecla);
      document.removeEventListener("mousedown", fuera);
    };
  }, [tiempoAbierto]);

  useEffect(() => {
    if (!tiempoPorDefecto && tiempoAbierto) setTiempoAbierto(false);
  }, [tiempoPorDefecto, tiempoAbierto]);

  async function cerrarSesion() {
    await salir();
    cerrarMenu(false);
    navegar("/login");
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-line">
        <nav aria-label="Principal" className="relative mx-auto flex max-w-3xl items-center gap-1 px-4 py-2">
          <Link
            to="/"
            title="TolochaHome"
            aria-label="TolochaHome (inicio)"
            className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2"
          >
            <img src="/logo.svg" alt="" width={28} height={28} className="rounded" />
            <span className="hidden text-lg font-semibold tracking-tight min-[400px]:inline">
              Tolocha<span className="text-brand">Home</span>
            </span>
          </Link>
          {tiempoPorDefecto && (
            <button
              ref={botonTiempo}
              type="button"
              onClick={() => setTiempoAbierto((v) => !v)}
              aria-expanded={tiempoAbierto}
              aria-controls="panel-tiempo"
              aria-haspopup="dialog"
              title={`${condicion(tiempoPorDefecto.datos.actual.codigo)} en ${tiempoPorDefecto.ciudad.nombre}`}
              aria-label={`Tiempo en ${tiempoPorDefecto.ciudad.nombre}: ${condicion(
                tiempoPorDefecto.datos.actual.codigo,
              )}, ${Math.round(tiempoPorDefecto.datos.actual.temperatura)} grados. Abrir detalle`}
              className="flex min-h-[44px] items-center gap-1 rounded px-2 text-soft"
            >
              <IconoTiempo
                clave={claveIcono(
                  tiempoPorDefecto.datos.actual.codigo,
                  tiempoPorDefecto.datos.actual.esDia,
                )}
                width={20}
                height={20}
              />
              <span className="text-sm">
                {Math.round(tiempoPorDefecto.datos.actual.temperatura)}°
              </span>
            </button>
          )}
          <span className="flex-1" />
          {autenticada && (
            <NavLink
              to="/gestion"
              title="Gestionar"
              aria-label="Gestionar grupos y favoritos"
              className={({ isActive }) =>
                `hidden min-h-[44px] min-w-[44px] items-center justify-center rounded sm:flex ${
                  isActive ? "text-brand" : "text-muted"
                }`
              }
            >
              <IconoGestion />
            </NavLink>
          )}
          <button
            type="button"
            onClick={siguienteTema}
            title={ICONO_TEMA[tema].etiqueta}
            aria-label={`${ICONO_TEMA[tema].etiqueta} (pulsa para cambiar)`}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-soft"
          >
            {ICONO_TEMA[tema].icono}
          </button>
          <span className="hidden items-center gap-1 sm:flex">
            {autenticada && (
              <>
                <NavLink
                  to="/config"
                  title="Configuración"
                  aria-label="Configuración"
                  className={({ isActive }) => claseEnlace(isActive)}
                >
                  <IconoConfig />
                </NavLink>
                <NavLink
                  to="/perfil"
                  title="Usuario"
                  aria-label="Usuario"
                  className={({ isActive }) => claseEnlace(isActive)}
                >
                  <IconoUsuario />
                </NavLink>
                <button
                  type="button"
                  onClick={cerrarSesion}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-muted"
                >
                  <IconoSalir />
                </button>
              </>
            )}
            <NavLink
              to="/acerca-de"
              title="Acerca de"
              aria-label="Acerca de"
              className={({ isActive }) => claseEnlace(isActive)}
            >
              <IconoInfo />
            </NavLink>
            {!autenticada && estado !== "cargando" && (
              <Link to="/login" className="ml-2 font-bold text-brand">
                Entrar
              </Link>
            )}
          </span>
          <button
            ref={botonMenu}
            type="button"
            onClick={() => (menuAbierto ? cerrarMenu(false) : setMenuAbierto(true))}
            aria-expanded={menuAbierto}
            aria-controls="menu-navegacion"
            title="Menú"
            aria-label="Menú de navegación"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-soft sm:hidden"
          >
            <IconoMenu />
          </button>
          {menuAbierto && (
            <div
              ref={panelMenu}
              id="menu-navegacion"
              className="absolute inset-x-4 top-full z-20 space-y-1 rounded border border-line bg-surface-raised p-2 shadow-lg sm:hidden"
            >
              {autenticada && (
                <>
                  <NavLink
                    to="/gestion"
                    onClick={() => cerrarMenu(false)}
                    className={({ isActive }) => claseFila(isActive)}
                  >
                    <IconoGestion /> Gestionar
                  </NavLink>
                  <NavLink
                    to="/config"
                    onClick={() => cerrarMenu(false)}
                    className={({ isActive }) => claseFila(isActive)}
                  >
                    <IconoConfig /> Configuración
                  </NavLink>
                  <NavLink
                    to="/perfil"
                    onClick={() => cerrarMenu(false)}
                    className={({ isActive }) => claseFila(isActive)}
                  >
                    <IconoUsuario /> Usuario
                  </NavLink>
                  <button
                    type="button"
                    onClick={cerrarSesion}
                    className="flex min-h-[44px] w-full items-center gap-3 rounded px-3 text-left text-soft"
                  >
                    <IconoSalir /> Cerrar sesión
                  </button>
                </>
              )}
              <NavLink
                to="/acerca-de"
                onClick={() => cerrarMenu(false)}
                className={({ isActive }) => claseFila(isActive)}
              >
                <IconoInfo /> Acerca de
              </NavLink>
              {!autenticada && estado !== "cargando" && (
                <NavLink
                  to="/login"
                  onClick={() => cerrarMenu(false)}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded px-3 text-left font-bold text-brand"
                >
                  Entrar
                </NavLink>
              )}
            </div>
          )}
          {tiempoAbierto && tiempoPorDefecto && (
            <div
              ref={panelTiempo}
              id="panel-tiempo"
              role="dialog"
              aria-label="Detalle del tiempo"
              className="absolute left-4 top-full z-30 w-72 max-w-[calc(100vw-2rem)] rounded border border-line bg-surface-raised p-3 shadow-lg"
            >
              <PanelTiempo
                tiempo={listaTiempo}
                porDefectoId={tiempoPorDefecto.ciudad.id}
                onCambiarCiudad={(id) => editarCiudad.mutate({ id, porDefecto: true })}
                cambiando={editarCiudad.isPending}
              />
            </div>
          )}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
