import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { esApiError } from "../lib/api.js";
import { useAuthStore } from "../stores/auth.js";
import { IconoConfig } from "../components/Iconos.js";
import { GestionCiudades } from "../components/GestionCiudades.js";
import { leerApertura, leerTamano, guardarTamano, leerModo, guardarModo, TAMANOS_ENLACE, type Apertura, type TamanoEnlace, type ModoEnlace } from "../components/MosaicoFavorito.js";

interface Salud {
  ok: boolean;
  servicio: string;
  version: string;
  registroAbierto: boolean;
}

interface ResumenImport {
  creados: { grupos: number; favoritos: number };
  omitidos: { grupo: string; titulo: string; motivo: string }[];
}

async function peticionAutenticada(ruta: string, init?: RequestInit): Promise<Response> {
  const token = useAuthStore.getState().accessToken;
  return fetch(ruta, {
    ...init,
    credentials: "include",
    headers: { ...(init?.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
}

function Intercambio() {
  const cliente = useQueryClient();
  const [resumen, setResumen] = useState<ResumenImport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState(false);

  async function importar(lista: FileList | null) {
    const fichero = lista?.[0];
    if (!fichero) return;
    setError(null);
    setResumen(null);
    setOcupada(true);
    try {
      const cuerpo = new FormData();
      cuerpo.append("fichero", fichero);
      const res = await peticionAutenticada("/api/v1/import", { method: "POST", body: cuerpo });
      const datos = (await res.json().catch(() => undefined)) as
        | (ResumenImport & { error?: { mensaje?: string } })
        | undefined;
      if (!res.ok) throw new Error(datos?.error?.mensaje ?? `Error ${res.status}`);
      setResumen({ creados: datos!.creados, omitidos: datos!.omitidos ?? [] });
      cliente.invalidateQueries({ queryKey: ["grupos"] });
      cliente.invalidateQueries({ queryKey: ["favoritos"] });
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : (err as Error).message);
    } finally {
      setOcupada(false);
    }
  }

  async function exportar(formato: "html" | "json") {
    setError(null);
    try {
      const res = await peticionAutenticada(`/api/v1/export?formato=${formato}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tolochahome-marcadores.${formato}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(esApiError(err) ? err.mensaje : (err as Error).message);
    }
  }

  return (
    <section className="space-y-3 rounded border border-line p-4">
      <h2 className="font-bold">Importar / exportar</h2>
      <label className="block text-sm text-soft">
        Importar Netscape HTML o JSON propio (hasta 5 MB)
        <input
          type="file"
          accept=".html,.htm,.json,text/html,application/json"
          onChange={(e) => importar(e.target.files)}
          disabled={ocupada}
          className="mt-1 block w-full text-sm"
        />
      </label>
      {ocupada && <p className="text-sm text-muted">Importando…</p>}
      {resumen && (
        <p role="status" className="text-sm text-soft">
          {resumen.creados.grupos} grupos y {resumen.creados.favoritos} favoritos importados
          {resumen.omitidos.length > 0 && ` (${resumen.omitidos.length} omitidos)`}.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-ochre-600">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => exportar("html")}
          className="min-h-[44px] flex-1 rounded border border-line px-3 text-sm text-soft"
        >
          Exportar HTML
        </button>
        <button
          type="button"
          onClick={() => exportar("json")}
          className="min-h-[44px] flex-1 rounded border border-line px-3 text-sm text-soft"
        >
          Exportar JSON
        </button>
      </div>
    </section>
  );
}

export function Config() {
  const [apertura, setApertura] = useState<Apertura>(() => leerApertura());
  const [tamano, setTamano] = useState<TamanoEnlace>(() => leerTamano());
  const [modo, setModo] = useState<ModoEnlace>(() => leerModo());
  const salud = useQuery({
    queryKey: ["salud"],
    queryFn: () => fetch("/api/v1/health").then((r) => r.json() as Promise<Salud>),
  });

  function cambiarApertura(v: Apertura) {
    setApertura(v);
    localStorage.setItem("tolochahome-apertura", v);
  }

  function cambiarTamano(v: TamanoEnlace) {
    setTamano(v);
    guardarTamano(v);
  }

  function cambiarModo(v: ModoEnlace) {
    setModo(v);
    guardarModo(v);
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <IconoConfig /> Configuración
      </h1>
      <section className="space-y-2 rounded border border-line p-4">
        <h2 className="font-bold">Apertura de enlaces</h2>
        <div className="flex gap-2">
          {(["nueva", "misma"] as Apertura[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={apertura === v}
              onClick={() => cambiarApertura(v)}
              className={`min-h-[44px] flex-1 rounded border px-3 ${
                apertura === v ? "border-brand font-bold text-brand" : "border-line text-muted"
              }`}
            >
              {v === "nueva" ? "Nueva pestaña" : "Misma pestaña"}
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-2 rounded border border-line p-4">
        <h2 className="font-bold">Tamaño de enlaces</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tamaño de enlaces">
          {TAMANOS_ENLACE.map((t) => (
            <button
              key={t.valor}
              type="button"
              aria-pressed={tamano === t.valor}
              onClick={() => cambiarTamano(t.valor)}
              className={`min-h-[44px] flex-1 rounded border px-3 text-sm whitespace-nowrap ${
                tamano === t.valor ? "border-brand font-bold text-brand" : "border-line text-muted"
              }`}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-2 rounded border border-line p-4">
        <h2 className="font-bold">Presentación de enlaces</h2>
        <div className="flex gap-2" role="group" aria-label="Presentación de enlaces">
          {(["carpetas", "listas"] as ModoEnlace[]).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={modo === v}
              onClick={() => cambiarModo(v)}
              className={`min-h-[44px] flex-1 rounded border px-3 ${
                modo === v ? "border-brand font-bold text-brand" : "border-line text-muted"
              }`}
            >
              {v === "carpetas" ? "Carpetas" : "Listas"}
            </button>
          ))}
        </div>
      </section>
      <GestionCiudades />
      <section className="space-y-2 rounded border border-line p-4">
        <h2 className="font-bold">Registro</h2>
        <p className="text-sm text-muted">
          {salud.data === undefined
            ? "Consultando…"
            : salud.data.registroAbierto
              ? "Esta instancia admite nuevas cuentas."
              : "Esta instancia no admite nuevas cuentas (solo entrar)."}
        </p>
      </section>
      <Intercambio />
    </div>
  );
}
