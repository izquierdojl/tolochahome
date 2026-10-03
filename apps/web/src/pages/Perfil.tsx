import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/auth.js";

export function Perfil() {
  const usuario = useAuthStore((s) => s.usuario);
  const salir = useAuthStore((s) => s.salir);
  const navegar = useNavigate();

  async function cerrarSesion() {
    await salir();
    navegar("/login");
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">Perfil</h1>
      <dl className="rounded border border-line p-4">
        <dt className="text-muted text-sm">Email</dt>
        <dd>{usuario?.email}</dd>
      </dl>
      <button
        type="button"
        onClick={cerrarSesion}
        className="w-full rounded border border-line px-3 py-2 text-soft"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
