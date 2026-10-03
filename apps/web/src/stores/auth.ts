import { create } from "zustand";
import { api, type RespuestaSesion, type UsuarioBasico } from "../lib/api.js";

export type EstadoSesion = "cargando" | "autenticada" | "anonima";

interface EstadoAuth {
  estado: EstadoSesion;
  usuario: UsuarioBasico | null;
  accessToken: string | null;
  iniciar: (sesion: RespuestaSesion) => void;
  renovar: () => Promise<boolean>;
  salir: () => Promise<void>;
  marcarAnonima: () => void;
}

async function pedirRenovacion(): Promise<RespuestaSesion> {
  return api<RespuestaSesion>("/api/v1/auth/refresh", { method: "POST" });
}

export const useAuthStore = create<EstadoAuth>()((set, get) => ({
  estado: "cargando",
  usuario: null,
  accessToken: null,

  iniciar: (sesion) =>
    set({ estado: "autenticada", usuario: sesion.usuario, accessToken: sesion.accessToken }),

  renovar: async () => {
    try {
      const sesion = await pedirRenovacion();
      get().iniciar(sesion);
      return true;
    } catch {
      set({ estado: "anonima", usuario: null, accessToken: null });
      return false;
    }
  },

  salir: async () => {
    try {
      await api("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Idempotente en servidor: salir siempre limpia el estado local.
    }
    set({ estado: "anonima", usuario: null, accessToken: null });
  },

  marcarAnonima: () => set({ estado: "anonima", usuario: null, accessToken: null }),
}));
