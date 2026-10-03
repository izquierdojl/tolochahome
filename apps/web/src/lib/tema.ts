/** Tema claro/oscuro: `auto` sigue a `prefers-color-scheme`. */

export type Tema = "auto" | "light" | "dark";
const CLAVE = "tolochahome-tema";

export function leerTema(): Tema {
  const guardado = localStorage.getItem(CLAVE);
  return guardado === "light" || guardado === "dark" ? guardado : "auto";
}

export function aplicarTema(tema:Tema): void {
  document.documentElement.dataset.theme = tema;
  localStorage.setItem(CLAVE, tema);
}

export function temaInicial(): Tema {
  const tema = leerTema();
  document.documentElement.dataset.theme = tema;
  return tema;
}
