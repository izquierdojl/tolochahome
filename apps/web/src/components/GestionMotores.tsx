import { useState } from "react";
import { esApiError } from "../lib/api.js";
import {
  useBorrarMotor,
  useCrearMotor,
  useEditarMotor,
  useMotores,
  type DatosMotor,
  type Motor,
} from "../hooks/useBusqueda.js";
import {
  IconoBajar,
  IconoGuardar,
  IconoLapiz,
  IconoMas,
  IconoPapelera,
  IconoSubir,
  IconoX,
} from "../components/Iconos.js";

function FormularioMotor({
  inicial,
  onHecho,
}: {
  inicial?: Motor;
  onHecho: () => void;
}) {
  const crear = useCrearMotor();
  const editar = useEditarMotor();
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [alias, setAlias] = useState(inicial?.alias ?? "");
  const [plantilla, setPlantilla] = useState(inicial?.urlTemplate ?? "");
  const [sugerencias, setSugerencias] = useState(inicial?.sugerenciasUrl ?? "");
  const [defecto, setDefecto] = useState(inicial?.porDefecto ?? false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const datos: DatosMotor = {
      nombre,
      alias,
      urlTemplate: plantilla,
      sugerenciasUrl: sugerencias.trim() === "" ? null : sugerencias.trim(),
      porDefecto: defecto,
    };
    try {
      if (inicial) await editar.mutateAsync({ id: inicial.id, ...datos });
      else await crear.mutateAsync(datos);
      onHecho();
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo guardar");
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-wrap items-center gap-2">
      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre"
        maxLength={60}
        required
        aria-label="Nombre del buscador"
        className="min-w-28 min-h-[44px] flex-1 rounded border border-line bg-surface px-2 py-1 text-sm"
      />
      <input
        value={alias}
        onChange={(e) => setAlias(e.target.value)}
        placeholder="alias"
        maxLength={12}
        required
        aria-label="Alias (atajo)"
        className="w-24 rounded border border-line bg-surface px-2 py-1 text-sm min-h-[44px]"
      />
      <input
        value={plantilla}
        onChange={(e) => setPlantilla(e.target.value)}
        placeholder="https://…?q={q}"
        required
        inputMode="url"
        aria-label="Plantilla con {q}"
        className="min-w-40 min-h-[44px] flex-1 rounded border border-line bg-surface px-2 py-1 text-sm"
      />
      <input
        value={sugerencias}
        onChange={(e) => setSugerencias(e.target.value)}
        placeholder="Sugerencias (opcional)"
        aria-label="URL de sugerencias con {q} (opcional)"
        className="min-w-40 min-h-[44px] flex-1 rounded border border-line bg-surface px-2 py-1 text-sm"
      />
      <label className="flex min-h-[44px] items-center gap-1 text-sm text-soft">
        <input type="checkbox" checked={defecto} onChange={(e) => setDefecto(e.target.checked)} />
        Por defecto
      </label>
      <button
        type="submit"
        title={inicial ? "Guardar" : "Añadir"}
        aria-label={inicial ? "Guardar" : "Añadir"}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center font-bold text-brand"
      >
        {inicial ? <IconoGuardar /> : <IconoMas />}
      </button>
      <button
        type="button"
        onClick={onHecho}
        title="Cancelar"
        aria-label="Cancelar"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted"
      >
        <IconoX />
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-ochre-600">
          {error}
        </p>
      )}
    </form>
  );
}

/** Gestión de buscadores dentro de `/gestion`. */
export function GestionMotores() {
  const motores = useMotores();
  const editar = useEditarMotor();
  const borrar = useBorrarMotor();
  const [editando, setEditando] = useState<string | null>(null);
  const [aniadiendo, setAniadiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmarBorrado(m: Motor) {
    if (!window.confirm(`¿Borrar el buscador «${m.nombre}»?`)) return;
    setError(null);
    try {
      await borrar.mutateAsync(m.id);
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo borrar");
    }
  }

  return (
    <section aria-label="Buscadores" className="space-y-3 rounded border border-line p-4">
      <h2 className="text-lg font-bold">Buscadores</h2>
      <p className="text-sm text-muted">
        Usa el alias + espacio al inicio (`g …`, `w …`) para buscar con otro motor sin cambiar el activo.
      </p>
      {error && (
        <p role="alert" className="text-sm text-ochre-600">
          {error}
        </p>
      )}
      <ul className="space-y-2">
        {motores.data?.map((m, i, lista) => (
          <li key={m.id} className="flex min-h-[44px] items-center gap-1 rounded border border-line px-2 py-1">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-line text-sm font-bold"
            >
              {m.nombre.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <span className="flex-1 truncate text-sm">
              <strong>{m.nombre}</strong> <span className="text-muted">({m.alias})</span>
              {m.porDefecto && <span className="ml-1 text-xs text-brand">● por defecto</span>}
            </span>
            {editando === m.id ? null : (
              <>
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => editar.mutate({ id: m.id, orden: m.orden - 1 })}
                  title="Subir"
                  aria-label={`Subir ${m.nombre}`}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-soft disabled:opacity-30"
                >
                  <IconoSubir />
                </button>
                <button
                  type="button"
                  disabled={i === lista.length - 1}
                  onClick={() => editar.mutate({ id: m.id, orden: m.orden + 1 })}
                  title="Bajar"
                  aria-label={`Bajar ${m.nombre}`}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-soft disabled:opacity-30"
                >
                  <IconoBajar />
                </button>
                {!m.porDefecto && (
                  <button
                    type="button"
                    onClick={() => editar.mutate({ id: m.id, porDefecto: true })}
                    title="Marcar por defecto"
                    aria-label={`Marcar ${m.nombre} por defecto`}
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center text-sm text-muted"
                  >
                    ☆
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setEditando(m.id)}
                  title={`Editar ${m.nombre}`}
                  aria-label={`Editar ${m.nombre}`}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-soft"
                >
                  <IconoLapiz />
                </button>
                <button
                  type="button"
                  onClick={() => confirmarBorrado(m)}
                  title={`Borrar ${m.nombre}`}
                  aria-label={`Borrar ${m.nombre}`}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted"
                >
                  <IconoPapelera />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {editando && (
        <FormularioMotor
          inicial={motores.data?.find((m) => m.id === editando)}
          onHecho={() => setEditando(null)}
        />
      )}
      {aniadiendo ? (
        <FormularioMotor onHecho={() => setAniadiendo(false)} />
      ) : (
        !editando && (
          <button
            type="button"
            onClick={() => setAniadiendo(true)}
            className="flex min-h-[44px] items-center gap-1 text-sm text-brand"
          >
            <IconoMas /> Añadir buscador
          </button>
        )
      )}
    </section>
  );
}
