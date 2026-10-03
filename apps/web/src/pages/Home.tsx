import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth.js";
import { useGroups } from "../hooks/useGroups.js";
import { SeccionGrupo } from "../components/SeccionGrupo.js";

/** Portada: solo presentación y selección. La gestión vive en `/gestion`. */
export function Home() {
  const estado = useAuthStore((s) => s.estado);
  const usuario = useAuthStore((s) => s.usuario);
  const grupos = useGroups();
  const [seleccion, setSeleccion] = useState<string | null>(null);

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

  const visibles = seleccion ? (grupos.data ?? []).filter((g) => g.id === seleccion) : (grupos.data ?? []);

  return (
    <div className="space-y-4">
      {(grupos.data ?? []).length > 1 && (
        <div role="group" aria-label="Seleccionar grupo" className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSeleccion(null)}
            aria-pressed={seleccion === null}
            className={`rounded border px-3 min-h-[44px] ${seleccion === null ? "border-brand font-bold text-brand" : "border-line text-muted"}`}
          >
            Todos
          </button>
          {grupos.data?.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSeleccion(g.id)}
              aria-pressed={seleccion === g.id}
              className={`rounded border px-3 min-h-[44px] ${seleccion === g.id ? "border-brand font-bold text-brand" : "border-line text-soft"}`}
            >
              {g.nombre}
            </button>
          ))}
        </div>
      )}
      {grupos.isPending && <p className="text-muted">Cargando…</p>}
      {visibles.map((g) => (
        <SeccionGrupo key={g.id} grupo={g} userId={usuario.id} />
      ))}
      {visibles.length === 0 && !grupos.isPending && (
        <p className="text-center text-muted">
          Aún no tienes grupos. Créalos en <Link to="/gestion" className="text-brand">Gestión</Link>.
        </p>
      )}
    </div>
  );
}
