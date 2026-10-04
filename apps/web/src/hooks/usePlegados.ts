import { useState } from "react";

function clavePlegados(userId: string): string {
  return `tolochahome-plegados:${userId}`;
}

function leerPlegados(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(clavePlegados(userId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/** Estado de plegado compartido de la portada: por grupo + acciones globales. */
export function usePlegados(userId: string, gruposIds: string[]) {
  const [plegados, setPlegados] = useState<Set<string>>(() => leerPlegados(userId));

  function persistir(siguiente: Set<string>) {
    localStorage.setItem(clavePlegados(userId), JSON.stringify([...siguiente]));
    setPlegados(siguiente);
  }

  function alternar(groupId: string) {
    const siguiente = new Set(plegados);
    if (siguiente.has(groupId)) siguiente.delete(groupId);
    else siguiente.add(groupId);
    persistir(siguiente);
  }

  function plegarTodos() {
    persistir(new Set(gruposIds));
  }

  function desplegarTodos() {
    persistir(new Set());
  }

  const todoPlegado = gruposIds.length > 0 && gruposIds.every((id) => plegados.has(id));

  return { plegados, alternar, plegarTodos, desplegarTodos, todoPlegado };
}

/** Plegado individual de un solo grupo (usado en `/gestion`). */
export function usePlegado(userId: string, groupId: string): [boolean, () => void] {
  const [plegados, setPlegados] = useState<Set<string>>(() => leerPlegados(userId));
  const plegado = plegados.has(groupId);
  function alternar() {
    setPlegados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(groupId)) siguiente.delete(groupId);
      else siguiente.add(groupId);
      localStorage.setItem(clavePlegados(userId), JSON.stringify([...siguiente]));
      return siguiente;
    });
  }
  return [plegado, alternar];
}
