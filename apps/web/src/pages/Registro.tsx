import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, esApiError, type RespuestaSesion } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";

export function Registro() {
  const navegar = useNavigate();
  const iniciar = useAuthStore((s) => s.iniciar);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cerrado, setCerrado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCerrado(false);
    setEnviando(true);
    try {
      const sesion = await api<RespuestaSesion>("/api/v1/auth/registro", {
        method: "POST",
        body: { email, password },
      });
      iniciar(sesion);
      navegar("/", { replace: true });
    } catch (err) {
      if (esApiError(err) && err.status === 403) {
        // Registro cerrado en esta instancia: se informa y se ofrece el login.
        setCerrado(true);
      } else {
        setError(esApiError(err) ? err.mensaje : "No se pudo crear la cuenta");
      }
    } finally {
      setEnviando(false);
    }
  }

  if (cerrado) {
    return (
      <div className="mx-auto max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold">Registro cerrado</h1>
        <p className="text-muted">
          Esta instancia no admite nuevas cuentas. Si ya tienes una, puedes entrar con ella.
        </p>
        <Link to="/login" className="text-brand font-bold">
          Ir al login
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Crear cuenta</h1>
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
          <span className="text-muted text-sm">Contraseña (mínimo 8 caracteres)</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
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
          {enviando ? "Creando…" : "Crear cuenta"}
        </button>
      </form>
      <p className="text-sm text-muted">
        ¿Ya tienes cuenta? <Link to="/login" className="text-brand">Entrar</Link>
      </p>
    </div>
  );
}
