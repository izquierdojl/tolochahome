import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/auth.js";

export function Home() {
  const estado = useAuthStore((s) => s.estado);
  const usuario = useAuthStore((s) => s.usuario);

  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">TolochaHome</h1>
        <p className="text-muted">
          {estado === "autenticada" && usuario
            ? `Hola, ${usuario.email}: tus grupos y favoritos vivirán aquí.`
            : "Tu página principal: grupos, favoritos y búsqueda directa."}
        </p>
      </div>
      {estado === "autenticada" ? (
        <p className="text-soft">
          Speed dial, buscadores e importación llegarán en los próximos changes.
        </p>
      ) : (
        estado === "anonima" && (
          <p className="space-x-4">
            <Link to="/login" className="text-brand font-bold">
              Entrar
            </Link>
            <Link to="/registro" className="text-soft">
              Crear cuenta
            </Link>
          </p>
        )
      )}
    </div>
  );
}
