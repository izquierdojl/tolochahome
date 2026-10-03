import { useState } from "react";
import { Link } from "react-router-dom";
import { esApiError } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";
import {
  useBorrarGrupo,
  useCrearGrupo,
  useGroups,
  useMoverGrupo,
  useRenombrarGrupo,
  type Grupo,
} from "../hooks/useGroups.js";

function TarjetaGrupo({
  grupo,
  primero,
  ultimo,
}: {
  grupo: Grupo;
  primero: boolean;
  ultimo: boolean;
}) {
  const renombrar = useRenombrarGrupo();
  const mover = useMoverGrupo();
  const borrar = useBorrarGrupo();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(grupo.nombre);
  const [error, setError] = useState<string | null>(null);

  async function guardarNombre(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await renombrar.mutateAsync({ id: grupo.id, nombre });
      setEditando(false);
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo renombrar");
    }
  }

  async function confirmarBorrado() {
    if (!window.confirm(`¿Borrar el grupo «${grupo.nombre}»?`)) return;
    setError(null);
    try {
      await borrar.mutateAsync(grupo.id);
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo borrar");
    }
  }

  return (
    <section aria-label={grupo.nombre} className="rounded border border-line p-4">
      <div className="flex items-center gap-2">
        {editando ? (
          <form onSubmit={guardarNombre} className="flex flex-1 gap-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={100}
              aria-label="Nombre del grupo"
              className="flex-1 rounded border border-line bg-surface px-2 py-1"
            />
            <button type="submit" className="font-bold text-brand">
              Guardar
            </button>
            <button type="button" onClick={() => setEditando(false)} className="text-muted">
              Cancelar
            </button>
          </form>
        ) : (
          <>
            <h2 className="flex-1 text-lg font-bold">{grupo.nombre}</h2>
            <button
              type="button"
              aria-label={`Subir ${grupo.nombre}`}
              disabled={primero}
              onClick={() => mover.mutate({ id: grupo.id, orden: grupo.orden - 1 })}
              className="text-soft disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Bajar ${grupo.nombre}`}
              disabled={ultimo}
              onClick={() => mover.mutate({ id: grupo.id, orden: grupo.orden + 1 })}
              className="text-soft disabled:opacity-30"
            >
              ↓
            </button>
            <button type="button" onClick={() => setEditando(true)} className="text-soft">
              Renombrar
            </button>
            <button type="button" onClick={confirmarBorrado} className="text-muted">
              Borrar
            </button>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-ochre-600">
          {error}
        </p>
      )}
      <p className="mt-3 text-sm text-muted">
        {grupo.favoritos === 0
          ? "Sin favoritos todavía."
          : `${grupo.favoritos} favorito${grupo.favoritos === 1 ? "" : "s"}.`}
      </p>
    </section>
  );
}

function GestionGrupos() {
  const grupos = useGroups();
  const crear = useCrearGrupo();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function crearGrupo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await crear.mutateAsync(nombre);
      setNombre("");
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo crear el grupo");
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={crearGrupo} className="flex gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nuevo grupo…"
          maxLength={100}
          aria-label="Nombre del nuevo grupo"
          className="flex-1 rounded border border-line bg-surface px-3 py-2"
        />
        <button
          type="submit"
          disabled={crear.isPending || nombre.trim() === ""}
          className="rounded bg-brand px-3 py-2 font-bold text-pine-950 disabled:opacity-50"
        >
          Añadir
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-ochre-600">
          {error}
        </p>
      )}
      {grupos.isPending && <p className="text-muted">Cargando grupos…</p>}
      {grupos.data?.map((g, i) => (
        <TarjetaGrupo key={g.id} grupo={g} primero={i === 0} ultimo={i === grupos.data.length - 1} />
      ))}
      {grupos.data?.length === 0 && (
        <p className="text-muted">Aún no tienes grupos. Crea el primero arriba.</p>
      )}
    </div>
  );
}

export function Home() {
  const estado = useAuthStore((s) => s.estado);
  const usuario = useAuthStore((s) => s.usuario);

  if (estado === "autenticada" && usuario) {
    return (
      <div className="space-y-6">
        <p className="text-muted">Hola, {usuario.email}: estos son tus grupos.</p>
        <GestionGrupos />
      </div>
    );
  }

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
