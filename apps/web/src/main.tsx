import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

function App() {
  return (
    <main className="min-h-dvh grid place-items-center">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">TolochaHome</h1>
        <p className="text-muted">Startpage autoalojada — esqueleto inicial.</p>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
