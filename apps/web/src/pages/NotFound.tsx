import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <div className="space-y-2 text-center">
      <h1 className="text-2xl font-bold">No encontrado</h1>
      <p className="text-muted">Esta página no existe.</p>
      <Link to="/" className="text-brand">
        Volver al inicio
      </Link>
    </div>
  );
}
