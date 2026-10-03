import { useState } from "react";
import { Link } from "react-router-dom";
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
import { leerApertura, MosaicoFavorito, type Apertura } from "../components/MosaicoFavorito.js";

/* ---------- Persiana (plegado por usuario y grupo, persistente) ---------- */

function clavePlegados(userId: string): string {
  return `tolochahome-plegados:${userId}`;
}

function leerPlegados(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(clavePlegados(userId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function usePlegado(userId: string, groupId: string): [boolean, () => void] {
  const [plegados, setPlegados] = useState<Set<string>>(() => leerPlegados(userId));
  const plegado = plegados.has(groupId);
  function alternar() {
    setPlegados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(groupId)) siguiente.delete(groupId);
      else siguiente.add(groupId);
      localStorage.setItem(clavePlegados(userId), JSON.stringify([...siguiente]));
      return siguiente;
    });
  }
  return [plegado, alternar];
}

/* ---------- Formulario de favorito (con elección de imagen) ---------- */

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

  async function obtenerVistaPrevia() {
    setError(null);
    try {
      const vista = await previsualizar.mutateAsync(url);
      if (vista.titulo && !titulo) setTitulo(vista.titulo);
      if (vista.imagen) {
        setModoImagen("propia");
        setImagenAdoptada(vista.imagen);
        setFichero(null);
      }
      if (!vista.titulo && !vista.imagen) setError("Sin vista previa para esa URL");
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo previsualizar");
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
        className="min-w-32 flex-1 rounded border border-line bg-surface px-2 py-1 text-sm"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
        required
        inputMode="url"
        aria-label="URL del favorito"
        className="min-w-40 flex-1 rounded border border-line bg-surface px-2 py-1 text-sm"
      />
      {grupos.length > 1 && (
        <select
          value={grupo}
          onChange={(e) => setGrupo(e.target.value)}
          aria-label="Grupo del favorito"
          className="rounded border border-line bg-surface px-2 py-1 text-sm"
        >
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
        </select>
      )}
      <label className="flex items-center gap-1 text-sm text-soft">
        <input
          type="radio"
          checked={modoImagen === "favicon"}
          onChange={() => setModoImagen("favicon")}
        />
        Favicon
      </label>
      <label className="flex items-center gap-1 text-sm text-soft">
        <input
          type="radio"
          checked={modoImagen === "propia"}
          onChange={() => setModoImagen("propia")}
        />
        Imagen propia
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
        </>
      )}
      <button
        type="button"
        onClick={obtenerVistaPrevia}
        disabled={!url || previsualizar.isPending}
        className="text-sm text-soft disabled:opacity-50 min-h-[44px]"
      >
        {previsualizar.isPending ? "Buscando…" : "Obtener vista previa"}
      </button>
      <button type="submit" className="font-bold text-brand text-sm min-h-[44px]">
        {inicial ? "Guardar" : "Añadir"}
      </button>
      <button type="button" onClick={onHecho} className="text-muted text-sm">
        Cancelar
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

/* ---------- Tarjeta de grupo (persiana + mosaicos + gestión) ---------- */

function TarjetaGrupo({
  grupo,
  grupos,
  apertura,
  userId,
  primero,
  ultimo,
}: {
  grupo: Grupo;
  grupos: Grupo[];
  apertura: Apertura;
  userId: string;
  primero: boolean;
  ultimo: boolean;
}) {
  const renombrar = useRenombrarGrupo();
  const mover = useMoverGrupo();
  const borrarGrupo = useBorrarGrupo();
  const borrarFavorito = useBorrarFavorito();
  const favoritos = useBookmarks(grupo.id);
  const [plegado, alternarPlegado] = usePlegado(userId, grupo.id);
  const [gestionando, setGestionando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(grupo.nombre);
  const [color, setColor] = useState(grupo.color ?? "");
  const [editandoFav, setEditandoFav] = useState<string | null>(null);
  const [aniadiendo, setAniadiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sortable = useSortable({ id: `g:${grupo.id}`, data: { kind: "grupo", id: grupo.id } });
  const { over } = useDndContext();
  const esDestinoGrupo = typeof over?.id === "string" && over.id.startsWith("g:") && over.id !== `g:${grupo.id}` && !sortable.isDragging;

  async function guardarNombre(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await renombrar.mutateAsync({ id: grupo.id, nombre, color: color || null });
      setEditando(false);
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo renombrar");
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
      <div className="flex min-h-[44px] items-center gap-2">
        <button
          type="button"
          aria-label={plegado ? `Desplegar ${grupo.nombre}` : `Plegar ${grupo.nombre}`}
          aria-expanded={!plegado}
          onClick={alternarPlegado}
          className="text-soft min-h-[44px] min-w-[44px]"
        >
          <span className={`inline-block transition-transform ${plegado ? "-rotate-90" : ""}`}>▾</span>
        </button>
        <button
          type="button"
          aria-label={`Arrastrar grupo ${grupo.nombre}`}
          title="Arrastrar para ordenar"
          {...sortable.attributes}
          {...sortable.listeners}
          className="cursor-grab touch-none text-muted min-h-[44px] min-w-[44px]"
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
              className="min-w-32 flex-1 rounded border border-line bg-surface px-2 py-1 min-h-[44px]"
            />
            <label className="flex items-center gap-1 text-sm text-soft min-h-[44px]">
              Color
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
            <button type="submit" className="font-bold text-brand min-h-[44px]">
              Guardar
            </button>
            <button type="button" onClick={() => setEditando(false)} className="text-muted min-h-[44px]">
              Cancelar
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
              onClick={() => setGestionando((v) => !v)}
              aria-expanded={gestionando}
              aria-label={`Gestionar ${grupo.nombre}`}
              className="text-soft min-h-[44px] min-w-[44px]"
              title="Gestionar grupo"
            >
              ⚙
            </button>
          </>
        )}
      </div>
      {gestionando && !editando && (
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <button
            type="button"
            aria-label={`Subir ${grupo.nombre}`}
            disabled={primero}
            onClick={() => mover.mutate({ id: grupo.id, orden: grupo.orden - 1 })}
            className="text-soft disabled:opacity-30"
          >
            ↑ Subir
          </button>
          <button
            type="button"
            aria-label={`Bajar ${grupo.nombre}`}
            disabled={ultimo}
            onClick={() => mover.mutate({ id: grupo.id, orden: grupo.orden + 1 })}
            className="text-soft disabled:opacity-30"
          >
            ↓ Bajar
          </button>
          <button type="button" onClick={() => setEditando(true)} className="text-soft">
            Renombrar
          </button>
          <button type="button" onClick={confirmarBorradoGrupo} className="text-muted">
            Borrar grupo
          </button>
        </div>
      )}
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
              gestionando && (
                <button
                  type="button"
                  onClick={() => setAniadiendo(true)}
                  className="text-sm text-brand"
                >
                  + Añadir favorito
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Gestión (lista de grupos con DnD) ---------- */

type Activo = { kind: "grupo"; id: string } | { kind: "favorito"; id: string } | null;

function GestionGrupos() {
  const grupos = useGroups();
  const crear = useCrearGrupo();
  const moverGrupo = useMoverGrupo();
  const editarFav = useEditarFavorito();
  const usuario = useAuthStore((s) => s.usuario);
  const cliente = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [colorNuevo, setColorNuevo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [apertura, setApertura] = useState<Apertura>(() => leerApertura());
  const [activo, setActivo] = useState<Activo>(null);
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  async function crearGrupo(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await crear.mutateAsync(
        colorNuevo ? { nombre, color: colorNuevo } : { nombre },
      );
      setNombre("");
      setColorNuevo("");
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : "No se pudo crear el grupo");
    }
  }

  function cambiarApertura(v: Apertura) {
    setApertura(v);
    localStorage.setItem("tolochahome-apertura", v);
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
        cliente.getQueryData<Favorito[]>(["favoritos", "todos"])?.filter((f) => f.groupId === datos.groupId) ??
        [];
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
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted">Abrir enlaces en:</span>
        <button
          type="button"
          aria-pressed={apertura === "nueva"}
          onClick={() => cambiarApertura("nueva")}
          className={apertura === "nueva" ? "font-bold" : "text-muted"}
        >
          Nueva pestaña
        </button>
        <button
          type="button"
          aria-pressed={apertura === "misma"}
          onClick={() => cambiarApertura("misma")}
          className={apertura === "misma" ? "font-bold" : "text-muted"}
        >
          Misma pestaña
        </button>
      </div>
      <form onSubmit={crearGrupo} className="flex flex-wrap gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nuevo grupo…"
          maxLength={100}
          aria-label="Nombre del nuevo grupo"
          className="min-w-40 flex-1 rounded border border-line bg-surface px-3 py-2 min-h-[44px]"
        />
        <label className="flex items-center gap-2 text-sm text-soft min-h-[44px]">
          Color
          <input
            type="color"
            value={colorNuevo || "#3c6a4d"}
            onChange={(e) => setColorNuevo(e.target.value)}
            aria-label="Color del nuevo grupo (vacío para el del tema)"
            className="h-11 w-11"
          />
          {colorNuevo && (
            <button type="button" onClick={() => setColorNuevo("")} className="text-muted min-h-[44px]">
              Quitar
            </button>
          )}
        </label>
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
                primero={i === 0}
                ultimo={i === grupos.data.length - 1}
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
    </div>
  );
}

export function Home() {
  const estado = useAuthStore((s) => s.estado);
  const usuario = useAuthStore((s) => s.usuario);

  if (estado === "autenticada" && usuario) {
    return (
      <div className="space-y-6">
        <p className="text-muted">Hola, {usuario.email}: este es tu speed dial.</p>
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
