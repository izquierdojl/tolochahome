import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell.js";
import { useAuthStore } from "./stores/auth.js";
import { Home } from "./pages/Home.js";
import { Login } from "./pages/Login.js";
import { Registro } from "./pages/Registro.js";
import { Perfil } from "./pages/Perfil.js";
import { NotFound } from "./pages/NotFound.js";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const estado = useAuthStore((s) => s.estado);
  const ubicacion = useLocation();
  if (estado === "cargando") {
    return <div className="py-16 text-center text-muted">Cargando sesión…</div>;
  }
  if (estado !== "autenticada") {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  }
  return children;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route
            path="/perfil"
            element={
              <RequireAuth>
                <Perfil />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
