import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSesion } from "../hooks/useSesion.js";
import { useAuthStore } from "../stores/auth.js";
import { aplicarTema, leerTema, type Tema } from "../lib/tema.js";
import {
  IconoAuto,
  IconoConfig,
  IconoGestion,
  IconoInfo,
  IconoInicio,
  IconoLuna,
  IconoSalir,
  IconoSol,
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

export function AppShell() {
  const { estado } = useSesion();
  const salir = useAuthStore((s) => s.salir);
  const navegar = useNavigate();
  const [tema, setTema] = useState<Tema>(() => leerTema());
  const autenticada = estado === "autenticada";

  function siguienteTema() {
    const siguiente = ORDEN_TEMAS[(ORDEN_TEMAS.indexOf(tema) + 1) % ORDEN_TEMAS.length];
    setTema(siguiente);
    aplicarTema(siguiente);
  }

  async function cerrarSesion() {
    await salir();
    navegar("/login");
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-line">
        <nav aria-label="Principal" className="mx-auto flex max-w-3xl items-center gap-1 px-4 py-2">
          <NavLink to="/" title="Inicio" aria-label="Inicio" className={({ isActive }) => claseEnlace(isActive)}>
            <IconoInicio />
          </NavLink>
          {autenticada && (
            <NavLink
              to="/gestion"
              title="Gestionar"
              aria-label="Gestionar grupos y favoritos"
              className={({ isActive }) => claseEnlace(isActive)}
            >
              <IconoGestion />
            </NavLink>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={siguienteTema}
            title={ICONO_TEMA[tema].etiqueta}
            aria-label={`${ICONO_TEMA[tema].etiqueta} (pulsa para cambiar)`}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded text-soft"
          >
            {ICONO_TEMA[tema].icono}
          </button>
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
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
