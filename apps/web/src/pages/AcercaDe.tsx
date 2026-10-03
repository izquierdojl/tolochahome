import { useQuery } from "@tanstack/react-query";
import { IconoInfo } from "../components/Iconos.js";

interface Salud {
  ok: boolean;
  servicio: string;
  version: string;
  registroAbierto: boolean;
}

export function AcercaDe() {
  const salud = useQuery({
    queryKey: ["salud"],
    queryFn: () => fetch("/api/v1/health").then((r) => r.json() as Promise<Salud>),
  });

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <IconoInfo /> Acerca de
      </h1>
      <dl className="space-y-3 rounded border border-line p-4">
        <div>
          <dt className="text-sm text-muted">Aplicación</dt>
          <dd className="font-bold">TolochaHome</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Versión en servicio</dt>
          <dd>{salud.data?.version ?? "Consultando…"}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Descripción</dt>
          <dd className="text-sm">
            Startpage autoalojada: grupos y favoritos speed dial, búsqueda directa y modo
            claro/oscuro. Tus datos, tu servidor.
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Repositorio</dt>
          <dd>
            <a
              href="https://github.com/izquierdojl/tolochahome"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand"
            >
              github.com/izquierdojl/tolochahome
            </a>
          </dd>
        </div>
      </dl>
    </div>
  );
}
