import { useEffect, useRef, useState } from "react";
import { leerApertura } from "./MosaicoFavorito.js";
import { pedirSugerencias, type Motor } from "../hooks/useBusqueda.js";

/** Extrae `alias + resto` si el inicio coincide con un motor conocido. */
export function resolverAlias(
  motores: Motor[],
  texto: string,
): { motor: Motor; consulta: string } | null {
  const m = /^(\S+) +([\s\S]*)$/.exec(texto);
  if (!m) return null;
  const motor = motores.find((x) => x.alias.toLowerCase() === m[1].toLowerCase());
  return motor ? { motor, consulta: m[2] } : null;
}

export function urlBusqueda(motor: Motor, consulta: string): string {
  return motor.urlTemplate.replace("{q}", encodeURIComponent(consulta));
}

/** Barra central de búsqueda directa con atajos por alias y autocompletado. */
export function BarraBusqueda({ motores }: { motores: Motor[] }) {
  const porDefecto = motores.find((m) => m.porDefecto) ?? motores[0];
  const [motorId, setMotorId] = useState(porDefecto?.id ?? "");
  const [texto, setTexto] = useState("");
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const [indice, setIndice] = useState(-1);
  const [abierta, setAbierta] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const motor = motores.find((m) => m.id === motorId) ?? porDefecto;

  useEffect(() => {
    setMotorId((actual) => (motores.some((m) => m.id === actual) ? actual : (porDefecto?.id ?? "")));
  }, [motores, porDefecto?.id]);

  // Autocompletado con debounce y cancelación.
  useEffect(() => {
    const resuelto = resolverAlias(motores, texto);
    const consulta = (resuelto ? resuelto.consulta : texto).trim();
    const motorSug = resuelto?.motor ?? motor;
    if (!motorSug?.sugerenciasUrl || consulta.length < 2) {
      setSugerencias([]);
      setAbierta(false);
      return;
    }
    const control = new AbortController();
    const t = setTimeout(() => {
      pedirSugerencias(motorSug.id, consulta, control.signal)
        .then((lista) => {
          setSugerencias(lista);
          setIndice(-1);
          setAbierta(lista.length > 0);
        })
        .catch(() => undefined);
    }, 200);
    return () => {
      clearTimeout(t);
      control.abort();
    };
  }, [texto, motores, motor]);

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (!caja.current?.contains(e.target as Node)) setAbierta(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  function motorEfectivo(): Motor | undefined {
    return resolverAlias(motores, texto)?.motor ?? motor;
  }

  function consultaEfectiva(): string {
    return (resolverAlias(motores, texto)?.consulta ?? texto).trim();
  }

  function buscar(consulta: string, forzado?: Motor) {
    const objetivo = forzado ?? motorEfectivo();
    const q = (forzado ? consulta : consultaEfectiva()).trim();
    if (!objetivo || !q) return;
    setAbierta(false);
    window.open(urlBusqueda(objetivo, q), leerApertura() === "nueva" ? "_blank" : "_self", "noopener");
  }

  function tecla(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" && abierta) {
      e.preventDefault();
      setIndice((i) => (i + 1) % sugerencias.length);
    } else if (e.key === "ArrowUp" && abierta) {
      e.preventDefault();
      setIndice((i) => (i - 1 + sugerencias.length) % sugerencias.length);
    } else if (e.key === "Escape") {
      setAbierta(false);
      setIndice(-1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (indice >= 0 && sugerencias[indice]) {
        const elegida = sugerencias[indice];
        setTexto(elegida);
        buscar(elegida, motorEfectivo());
      } else {
        buscar(texto);
      }
    }
  }

  if (!motor) return null;
  return (
    <div ref={caja} className="relative mx-auto w-full max-w-xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          buscar(texto);
        }}
        className="flex gap-2"
      >
        <select
          value={motor.id}
          onChange={(e) => setMotorId(e.target.value)}
          aria-label="Elegir buscador"
          title={`Buscador: ${motor.nombre} (${motor.alias})`}
          className="min-h-[44px] w-32 shrink-0 rounded border border-line bg-surface-raised px-2 text-sm text-soft"
        >
          {motores.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={tecla}
          onFocus={() => sugerencias.length > 0 && setAbierta(true)}
          placeholder={`Buscar con ${motor.nombre}… (prueba "${motor.alias} …")`}
          aria-label="Texto a buscar"
          aria-expanded={abierta}
          aria-controls="sugerencias-busqueda"
          role="combobox"
          aria-autocomplete="list"
          autoComplete="off"
          className="w-full min-w-0 flex-1 rounded border border-line bg-surface px-4 py-3 min-h-[44px]"
        />
      </form>
      {abierta && (
        <ul
          id="sugerencias-busqueda"
          role="listbox"
          className="absolute z-10 mt-1 w-full overflow-hidden rounded border border-line bg-surface-raised"
        >
          {sugerencias.map((s, i) => (
            <li key={`${s}-${i}`} role="option" aria-selected={i === indice}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setTexto(s);
                  buscar(s, motorEfectivo());
                }}
                onMouseEnter={() => setIndice(i)}
                className={`block w-full truncate px-4 py-2 text-left min-h-[44px] ${i === indice ? "bg-surface text-brand" : "text-soft"}`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
