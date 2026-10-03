import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useSesion } from "../hooks/useSesion.js";
import { useAuthStore } from "../stores/auth.js";
import { aplicarTema, leerTema, type Tema } from "../lib/tema.js";

const TEMAS: { valor: Tema; etiqueta: string }[] = [
  { valor: "auto", etiqueta: "Auto" },
  { valor: "light", etiqueta: "Claro" },
  { valor: "dark", etiqueta: "Oscuro" },
];

export function AppShell() {
  const { estado } = useSesion();
  const usuario = useAuthStore((s) => s.usuario);
  const salir = useAuthStore((s) => s.salir);
  const navegar = useNavigate();
  const [tema, setTema] = useState<Tema>(() => leerTema());

  async function cerrarSesion() {
    await salir();
    navegar("/login");
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-line">
        <nav className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <Link to="/" className="font-bold text-brand">
            TolochaHome
          </Link>
          <span className="flex-1" />
          {TEMAS.map((t) => (
            <button
              key={t.valor}
              type="button"
              aria-pressed={tema === t.valor}
              onClick={() => {
                setTema(t.valor);
                aplicarTema(t.valor);
              }}
              className={tema === t.valor ? "font-bold" : "text-muted"}
            >
              {t.etiqueta}
            </button>
          ))}
          {estado === "autenticada" && usuario ? (
            <>
              <Link to="/perfil" className="text-soft">
                {usuario.email}
              </Link>
              <button type="button" onClick={cerrarSesion} className="text-muted">
                Salir
              </button>
            </>
          ) : (
            <Link to="/login" className="text-soft">
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
