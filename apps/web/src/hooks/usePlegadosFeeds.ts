import { useState } from "react";

function clavePlegadosFeeds(userId: string): string {
  return `tolochahome-feeds-desplegados:${userId}`;
}

function leerDesplegados(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(clavePlegadosFeeds(userId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/**
 * Persianas de feeds desplegadas por usuario. Se guarda el conjunto de abiertas
 * (no el de cerradas) para que el estado inicial vacío signifique «todo plegado».
 */
export function usePlegadosFeeds(userId: string) {
  const [estado, setEstado] = useState<{ userId: string; abiertos: Set<string> }>(() => ({
    userId,
    abiertos: leerDesplegados(userId),
  }));

  if (estado.userId !== userId) {
    setEstado({ userId, abiertos: leerDesplegados(userId) });
  }
  const abiertos = estado.abiertos;

  function alternar(id: string) {
    const siguiente = new Set(abiertos);
    if (siguiente.has(id)) siguiente.delete(id);
    else siguiente.add(id);
    try {
      localStorage.setItem(clavePlegadosFeeds(userId), JSON.stringify([...siguiente]));
    } catch {
      // Sin localStorage el estado sigue en memoria.
    }
    setEstado({ userId, abiertos: siguiente });
  }

  return { abiertos, alternar };
}
