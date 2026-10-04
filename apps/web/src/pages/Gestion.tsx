import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useDndContext,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQueryClient } from "@tanstack/react-query";
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
import {
  useBorrarFavorito,
  useBookmarks,
  useCrearFavorito,
  useEditarFavorito,
  usePrevisualizar,
  useQuitarImagen,
  useSubirImagen,
  type Favorito,
} from "../hooks/useBookmarks.js";
import { usePlegado } from "../hooks/usePlegados.js";
import { leerApertura, MosaicoFavorito, type Apertura } from "../components/MosaicoFavorito.js";
import { GestionMotores } from "../components/GestionMotores.js";
import {
  IconoConfig,
  IconoGuardar,
  IconoLapiz,
  IconoMas,
  IconoPapelera,
  IconoX,
} from "../components/Iconos.js";

/* ---------- Formulario de favorito (vista previa automática) ---------- */

function FormularioFavorito({
  groupId,
  grupos,
  inicial,
  onHecho,
}: {
  groupId: string;
  grupos: Grupo[];
  inicial?: Favorito;
  onHecho: () => void;
}) {
  const crear = useCrearFavorito();
  const editar = useEditarFavorito();
  const subir = useSubirImagen();
  const quitar = useQuitarImagen();
  const previsualizar = usePrevisualizar();
  const ultimaAuto = useRef<string | null>(null);
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [url, setUrl] = useState(inicial?.url ?? "");
  const [grupo, setGrupo] = useState(inicial?.groupId ?? groupId);
  const [modoImagen, setModoImagen] = useState<"favicon" | "propia">(
    inicial?.imagen ? "propia" : "favicon",
  );
  const [fichero, setFichero] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [imagenAdoptada, setImagenAdoptada] = useState<string | null>(inicial?.imagen ?? null);
  const [error, setError] = useState<string | null>(null);

  function elegirFichero(lista: FileList | null) {
    const f = lista?.[0] ?? null;
    setFichero(f);
    setVistaPrevia((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
  }

  /** Al salir de la URL, trae la vista previa por defecto (favicon si no puede). */
  async function vistaPreviaAutomatica() {
    if (!url || titulo.trim() !== "" || ultimaAuto.current === url || previsualizar.isPending) return;
    ultimaAuto.current = url;
    try {
      const vista = await previsualizar.mutateAsync(url);
      if (vista.titulo) setTitulo(vista.titulo);
      if (vista.imagen) {
        setModoImagen("propia");
        setImagenAdoptada(vista.imagen);
      }
    } catch {
      // Sin vista previa: se queda el favicon. Sin ruido.
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const id = inicial
        ? (
            await editar.mutateAsync({ id: inicial.id, titulo, url, groupId: grupo })
          ).favorito?.id ?? inicial.id
        : (await crear.mutateAsync({ groupId: grupo, titulo, url })).favorito.id;
      if (modoImagen === "propia") {
        if (fichero) {
          await subir.mutateAsync({ id, fichero });
        } else if (imagenAdoptada && imagenAdoptada !== inicial?.imagen) {
          await editar.mutateAsync({ id, imagen: imagenAdoptada });
        }
      } else if (inicial?.imagen) {
        await quitar.mutateAsync(id);
      }
      onHecho();
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo guardar");
    }
  }

  return (
    <form onSubmit={guardar} className="flex flex-wrap items-center gap-2">
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Título"
        maxLength={150}
        required
        aria-label="Título del favorito"
        className="min-w-32 flex-1 rounded border border-line bg-surface px-2 py-1 text-sm min-h-[44px]"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={vistaPreviaAutomatica}
        placeholder="https://…"
        required
        inputMode="url"
        aria-label="URL del favorito"
        className="min-w-40 flex-1 rounded border border-line bg-surface px-2 py-1 text-sm min-h-[44px]"
      />
      {grupos.length > 1 && (
        <select
          value={grupo}
          onChange={(e) => setGrupo(e.target.value)}
          aria-label="Grupo del favorito"
          className="rounded border border-line bg-surface px-2 py-1 text-sm min-h-[44px]"
        >
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={() => previsualizar.mutateAsync(url).then((v) => {
          if (v.titulo) setTitulo(v.titulo);
          if (v.imagen) {
            setModoImagen("propia");
            setImagenAdoptada(v.imagen);
          }
        }).catch((err: unknown) => setError(esApiError(err) ? err.mensaje : "Sin vista previa"))}
        disabled={!url || previsualizar.isPending}
        title="Obtener vista previa"
        aria-label="Obtener vista previa"
        className="flex min-h-[44px] min-w-[44px] items-center justify-center text-soft disabled:opacity-50"
      >
        ⟳
      </button>
      <label className="flex min-h-[44px] items-center gap-1 text-sm text-soft">
        <input
          type="radio"
          checked={modoImagen === "favicon"}
          onChange={() => setModoImagen("favicon")}
        />
        Favicon
      </label>
      <label className="flex min-h-[44px] items-center gap-1 text-sm text-soft">
        <input
          type="radio"
          checked={modoImagen === "propia"}
          onChange={() => setModoImagen("propia")}
        />
        Imagen
      </label>
      {modoImagen === "propia" && (
        <>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => elegirFichero(e.target.files)}
            aria-label="Fichero de imagen (hasta 1 MB)"
            className="text-sm"
          />
          {vistaPrevia && <img src={vistaPrevia} alt="Vista previa" className="h-10 w-16 object-cover rounded" />}
          {!vistaPrevia && imagenAdoptada && <span className="text-xs text-muted">Con imagen ✓</span>}
        </>
      )}
      <button
        type="submit"
        title={inicial ? "Guardar" : "Añadir"}
        aria-label={inicial ? "Guardar" : "Añadir"}
        className="flex min-h-[44px] min-w-[44px] items-center justify-center font-bold text-brand"
      >
        <IconoGuardar />
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

/* ---------- Mosaico arrastrable ---------- */

function MosaicoArrastrable({
  favorito,
  apertura,
  onEditar,
  onBorrar,
}: {
  favorito: Favorito;
  apertura: Apertura;
  onEditar: () => void;
  onBorrar: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `f:${favorito.id}`,
    data: { kind: "favorito", id: favorito.id, groupId: favorito.groupId },
  });
  const { over } = useDndContext();
  const esDestino = over?.id === `f:${favorito.id}` && !isDragging;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`touch-none rounded ${isDragging ? "opacity-30" : ""} ${esDestino ? "outline-2 outline-brand rounded" : ""}`}
    >
      <MosaicoFavorito favorito={favorito} apertura={apertura} onEditar={onEditar} onBorrar={onBorrar} />
    </div>
  );
}

/* ---------- Tarjeta de grupo con gestión completa ---------- */

function TarjetaGrupo({
  grupo,
  grupos,
  apertura,
  userId,
}: {
  grupo: Grupo;
  grupos: Grupo[];
  apertura: Apertura;
  userId: string;
}) {
  const renombrar = useRenombrarGrupo();
  const borrarGrupo = useBorrarGrupo();
  const borrarFavorito = useBorrarFavorito();
  const favoritos = useBookmarks(grupo.id);
  const [plegado, alternarPlegado] = usePlegado(userId, grupo.id);
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(grupo.nombre);
  const [color, setColor] = useState(grupo.color ?? "");
  const [editandoFav, setEditandoFav] = useState<string | null>(null);
  const [aniadiendo, setAniadiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sortable = useSortable({ id: `g:${grupo.id}`, data: { kind: "grupo", id: grupo.id } });
  const { over } = useDndContext();
  const esDestinoGrupo =
    typeof over?.id === "string" &&
    over.id.startsWith("g:") &&
    over.id !== `g:${grupo.id}` &&
    !sortable.isDragging;

  async function guardarNombre(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await renombrar.mutateAsync({ id: grupo.id, nombre, color: color || null });
      setEditando(false);
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo guardar");
    }
  }

  async function confirmarBorradoGrupo() {
    const aviso =
      grupo.favoritos > 0
        ? `¿Borrar el grupo «${grupo.nombre}» y sus ${grupo.favoritos} favoritos?`
        : `¿Borrar el grupo «${grupo.nombre}»?`;
    if (!window.confirm(aviso)) return;
    setError(null);
    try {
      await borrarGrupo.mutateAsync(grupo.id);
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo borrar");
    }
  }

  async function confirmarBorradoFav(fav: Favorito) {
    if (!window.confirm(`¿Borrar «${fav.titulo}»?`)) return;
    try {
      await borrarFavorito.mutateAsync(fav.id);
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo borrar");
    }
  }

  return (
    <section
      aria-label={grupo.nombre}
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        borderLeftColor: grupo.color ?? undefined,
        borderLeftWidth: grupo.color ? 4 : undefined,
      }}
      className={`rounded border border-line p-4 ${sortable.isDragging ? "opacity-30" : ""} ${esDestinoGrupo ? "outline-2 outline-brand" : ""}`}
    >
      <div className="flex min-h-[44px] items-center gap-1">
        <button
          type="button"
          aria-label={plegado ? `Desplegar ${grupo.nombre}` : `Plegar ${grupo.nombre}`}
          aria-expanded={!plegado}
          onClick={alternarPlegado}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-soft"
        >
          <span className={`inline-block transition-transform ${plegado ? "-rotate-90" : ""}`}>▾</span>
        </button>
        <button
          type="button"
          aria-label={`Arrastrar grupo ${grupo.nombre}`}
          title="Arrastrar para ordenar"
          {...sortable.attributes}
          {...sortable.listeners}
          className="flex min-h-[44px] min-w-[44px] cursor-grab touch-none items-center justify-center text-muted"
        >
          ⠿
        </button>
        {editando ? (
          <form onSubmit={guardarNombre} className="flex flex-1 flex-wrap items-center gap-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={100}
              aria-label="Nombre del grupo"
              className="min-w-32 min-h-[44px] flex-1 rounded border border-line bg-surface px-2 py-1"
            />
            <label className="flex min-h-[44px] items-center gap-1 text-sm text-soft">
              <input
                type="color"
                value={color || "#3c6a4d"}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Color del grupo"
                className="h-11 w-11"
              />
              {color && (
                <button type="button" onClick={() => setColor("")} className="text-muted">
                  Quitar
                </button>
              )}
            </label>
            <button
              type="submit"
              title="Guardar"
              aria-label="Guardar"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center font-bold text-brand"
            >
              <IconoGuardar />
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              title="Cancelar"
              aria-label="Cancelar"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted"
            >
              <IconoX />
            </button>
          </form>
        ) : (
          <>
            <h2 className="flex-1 text-lg font-bold">
              {grupo.nombre}{" "}
              <span className="text-sm font-normal text-muted">({grupo.favoritos})</span>
            </h2>
            <button
              type="button"
              onClick={() => setEditando(true)}
              title={`Editar ${grupo.nombre} (nombre y color)`}
              aria-label={`Editar ${grupo.nombre}`}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-soft"
            >
              <IconoLapiz />
            </button>
            <button
              type="button"
              onClick={confirmarBorradoGrupo}
              title={`Borrar ${grupo.nombre}`}
              aria-label={`Borrar ${grupo.nombre}`}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted"
            >
              <IconoPapelera />
            </button>
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-ochre-600">
          {error}
        </p>
      )}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ${plegado ? "grid-rows-[0fr]" : "grid-rows-[1fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="mt-3 flex flex-wrap gap-3">
            <SortableContext
              items={(favoritos.data ?? []).map((f) => `f:${f.id}`)}
              strategy={rectSortingStrategy}
            >
              {favoritos.data?.map((f) =>
                editandoFav === f.id ? (
                  <div key={f.id} className="w-full">
                    <FormularioFavorito
                      groupId={grupo.id}
                      grupos={grupos}
                      inicial={f}
                      onHecho={() => setEditandoFav(null)}
                    />
                  </div>
                ) : (
                  <MosaicoArrastrable
                    key={f.id}
                    favorito={f}
                    apertura={apertura}
                    onEditar={() => setEditandoFav(f.id)}
                    onBorrar={() => confirmarBorradoFav(f)}
                  />
                ),
              )}
            </SortableContext>
            {favoritos.data?.length === 0 && !aniadiendo && (
              <p className="text-sm text-muted">Sin favoritos todavía.</p>
            )}
          </div>
          <div className="mt-3">
            {aniadiendo ? (
              <FormularioFavorito
                groupId={grupo.id}
                grupos={grupos}
                onHecho={() => setAniadiendo(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAniadiendo(true)}
                title="Añadir favorito"
                aria-label={`Añadir favorito en ${grupo.nombre}`}
                className="flex min-h-[44px] min-w-[44px] items-center gap-1 text-sm text-brand"
              >
                <IconoMas /> Añadir
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Pantalla de gestión ---------- */

type Activo = { kind: "grupo"; id: string } | { kind: "favorito"; id: string } | null;

export function Gestion() {
  const grupos = useGroups();
  const crear = useCrearGrupo();
  const moverGrupo = useMoverGrupo();
  const editarFav = useEditarFavorito();
  const usuario = useAuthStore((s) => s.usuario);
  const cliente = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [colorNuevo, setColorNuevo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activo, setActivo] = useState<Activo>(null);
  const apertura = leerApertura();
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  async function crearGrupo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await crear.mutateAsync(colorNuevo ? { nombre, color: colorNuevo } : { nombre });
      setNombre("");
      setColorNuevo("");
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo crear el grupo");
    }
  }

  function alEmpezar(e: DragStartEvent) {
    const datos = e.active.data.current as { kind?: string; id?: string } | undefined;
    if (datos?.kind === "grupo" && datos.id) setActivo({ kind: "grupo", id: datos.id });
    else if (datos?.kind === "favorito" && datos.id) setActivo({ kind: "favorito", id: datos.id });
  }

  function alSoltar(e: DragEndEvent) {
    setActivo(null);
    const datos = e.active.data.current as
      | { kind?: string; id?: string; groupId?: string }
      | undefined;
    if (!datos?.kind || !datos.id || !e.over) return;
    if (datos.kind === "grupo") {
      const lista = grupos.data ?? [];
      const destino = lista.findIndex((g) => `g:${g.id}` === e.over!.id);
      if (destino >= 0 && lista[destino].id !== datos.id) {
        moverGrupo.mutate({ id: datos.id, orden: lista[destino].orden });
      }
    } else if (datos.kind === "favorito" && datos.groupId) {
      const lista =
        cliente.getQueryData<Favorito[]>(["favoritos", datos.groupId]) ??
        cliente.getQueriesData<Favorito[]>({ queryKey: ["favoritos"] }).flatMap(([, l]) => l ?? []).filter((f) => f.groupId === datos.groupId);
      const destino = lista.findIndex((f) => `f:${f.id}` === e.over!.id);
      if (destino >= 0 && lista[destino].id !== datos.id) {
        editarFav.mutate({ id: datos.id, orden: lista[destino].orden });
      }
    }
  }

  const mosaicoActivo =
    activo?.kind === "favorito"
      ? (cliente.getQueriesData<Favorito[]>({ queryKey: ["favoritos"] }).flatMap(([, l]) => l ?? []).find((f) => f.id === activo.id) ?? null)
      : null;
  const grupoActivo =
    activo?.kind === "grupo" ? (grupos.data?.find((g) => g.id === activo.id) ?? null) : null;

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <IconoConfig /> Gestión
      </h1>
      <form onSubmit={crearGrupo} className="flex flex-wrap gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nuevo grupo…"
          maxLength={100}
          aria-label="Nombre del nuevo grupo"
          className="min-w-40 min-h-[44px] flex-1 rounded border border-line bg-surface px-3 py-2"
        />
        <label className="flex min-h-[44px] items-center gap-2 text-sm text-soft">
          Color
          <input
            type="color"
            value={colorNuevo || "#3c6a4d"}
            onChange={(e) => setColorNuevo(e.target.value)}
            aria-label="Color del nuevo grupo"
            className="h-11 w-11"
          />
          {colorNuevo && (
            <button type="button" onClick={() => setColorNuevo("")} className="text-muted">
              Quitar
            </button>
          )}
        </label>
        <button
          type="submit"
          disabled={crear.isPending || nombre.trim() === ""}
          title="Crear grupo"
          aria-label="Crear grupo"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded bg-brand px-3 font-bold text-pine-950 disabled:opacity-50"
        >
          <IconoMas />
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-ochre-600">
          {error}
        </p>
      )}
      {grupos.isPending && <p className="text-muted">Cargando grupos…</p>}
      <DndContext
        sensors={sensores}
        collisionDetection={closestCenter}
        onDragStart={alEmpezar}
        onDragEnd={alSoltar}
        onDragCancel={() => setActivo(null)}
      >
        <SortableContext
          items={(grupos.data ?? []).map((g) => `g:${g.id}`)}
          strategy={verticalListSortingStrategy}
        >
          {grupos.data?.map((g, i) => (
            <div key={g.id} className={i > 0 ? "mt-4" : ""}>
              <TarjetaGrupo
                grupo={g}
                grupos={grupos.data}
                apertura={apertura}
                userId={usuario?.id ?? ""}
              />
            </div>
          ))}
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 150, easing: "ease-out" }}>
          {grupoActivo ? (
            <div className="rounded border-2 border-brand bg-surface-raised p-4 font-bold shadow-lg">
              {grupoActivo.nombre}
            </div>
          ) : mosaicoActivo ? (
            <div className="w-28 rounded border-2 border-brand bg-surface p-2 text-center text-sm font-bold shadow-lg">
              {mosaicoActivo.titulo}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {grupos.data?.length === 0 && (
        <p className="text-muted">Aún no tienes grupos. Crea el primero arriba.</p>
      )}
      <GestionMotores />
    </div>
  );
}
