import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api, esApiError, type RespuestaSesion } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";

export function Login() {
  const navegar = useNavigate();
  const ubicacion = useLocation() as { state?: { desde?: string } };
  const iniciar = useAuthStore((s) => s.iniciar);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const sesion = await api<RespuestaSesion>("/api/v1/auth/login", {
        method: "POST",
        body: { email, password },
      });
      iniciar(sesion);
      navegar(ubicacion.state?.desde ?? "/", { replace: true });
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo entrar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Entrar</h1>
      <form onSubmit={enviar} className="space-y-3">
        <label className="block">
          <span className="text-muted text-sm">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-line bg-surface px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-muted text-sm">Contraseña</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-line bg-surface px-3 py-2"
          />
        </label>
        {error && <p role="alert" className="text-sm text-ochre-600">{error}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded bg-brand px-3 py-2 font-bold text-pine-950 disabled:opacity-50"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>
      <p className="text-sm text-muted">
        ¿Sin cuenta? <Link to="/registro" className="text-brand">Crear cuenta</Link>
      </p>
    </div>
  );
}
