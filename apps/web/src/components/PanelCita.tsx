import type { CitaDelDia } from "../hooks/useCita.js";

/** `AAAA-MM-DD` → «14 de noviembre de 2026» (sin pasar por UTC). */
function fechaLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  if (!anio || !mes || !dia) return fecha;
  return new Date(anio, mes - 1, dia).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const ENLACE = "text-brand underline underline-offset-2";

export function PanelCita({ cita }: { cita: CitaDelDia }) {
  return (
    <div className="max-h-[70vh] space-y-3 overflow-y-auto text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Cita del día · {fechaLarga(cita.fecha)}
      </p>
      <blockquote className="text-base leading-snug">«{cita.texto}»</blockquote>
      <p>
        <cite className="font-semibold not-italic">{cita.autor}</cite>
      </p>
      {cita.descripcion && <p className="text-soft">{cita.descripcion}</p>}
      <p className="border-t border-line pt-2 text-xs text-muted">
        Fuente:{" "}
        <a href={cita.enlace} target="_blank" rel="noopener noreferrer" className={ENLACE}>
          {cita.atribucion.fuente}
        </a>{" "}
        ·{" "}
        <a href={cita.atribucion.licenciaUrl} target="_blank" rel="noopener noreferrer" className={ENLACE}>
          {cita.atribucion.licencia}
        </a>
      </p>
    </div>
  );
}
