import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth.js";
import { useGroups } from "../hooks/useGroups.js";
import { useMotores } from "../hooks/useBusqueda.js";
import { BarraBusqueda } from "../components/BarraBusqueda.js";
import { SeccionGrupo } from "../components/SeccionGrupo.js";

/** Portada: solo presentación. La gestión vive en `/gestion`. */
export function Home() {
  const estado = useAuthStore((s) => s.estado);
  const usuario = useAuthStore((s) => s.usuario);
  const grupos = useGroups();
  const motores = useMotores();

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

  return (
    <div className="space-y-4">
      {motores.data && motores.data.length > 0 && <BarraBusqueda motores={motores.data} />}
      {grupos.isPending && <p className="text-muted">Cargando…</p>}
      {(grupos.data ?? []).map((g) => (
        <SeccionGrupo key={g.id} grupo={g} userId={usuario.id} />
      ))}
      {(grupos.data ?? []).length === 0 && !grupos.isPending && (
        <p className="text-center text-muted">
          Aún no tienes grupos. Créalos en <Link to="/gestion" className="text-brand">Gestión</Link>.
        </p>
      )}
    </div>
  );
}
