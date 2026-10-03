import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { IconoConfig } from "../components/Iconos.js";
import { leerApertura, type Apertura } from "../components/MosaicoFavorito.js";

interface Salud {
  ok: boolean;
  servicio: string;
  version: string;
  registroAbierto: boolean;
}

export function Config() {
  const [apertura, setApertura] = useState<Apertura>(() => leerApertura());
  const salud = useQuery({
    queryKey: ["salud"],
    queryFn: () => fetch("/api/v1/health").then((r) => r.json() as Promise<Salud>),
  });

  function cambiarApertura(v: Apertura) {
    setApertura(v);
    localStorage.setItem("tolochahome-apertura", v);
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
        <h2 className="font-bold">Registro</h2>
        <p className="text-sm text-muted">
          {salud.data === undefined
            ? "Consultando…"
            : salud.data.registroAbierto
              ? "Esta instancia admite nuevas cuentas."
              : "Esta instancia no admite nuevas cuentas (solo entrar)."}
        </p>
      </section>
    </div>
  );
}
