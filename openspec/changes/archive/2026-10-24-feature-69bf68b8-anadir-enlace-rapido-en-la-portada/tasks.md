# Tasks

## 1. Hooks de favoritos e invalidación de grupos

- [x] 1.1 En `apps/web/src/hooks/useBookmarks.ts`, ampliar el tipo de entrada de `useCrearFavorito` para aceptar `imagen?: string` opcional y actualizar `useInvalidar()` para que invalide tanto `["favoritos"]` como `["grupos"]`; verificar con `npm run typecheck --workspace @tolochahome/web`.

## 2. Botón y formulario de enlace rápido en la portada

- [x] 2.1 En `apps/web/src/pages/Home.tsx`, añadir la función de normalización y validación de URL (anteponiendo `https://` cuando no tenga esquema `http://` o `https://` y rechazando esquemas inválidos o dominios mal formados con error en español) y el componente/formulario de enlace rápido con `<input type="text" inputMode="url">`, `<select>` con los grupos del usuario, botón de guardar (`<IconoGuardar />`), botón de cancelar (`<IconoX />`) y cierre con `Escape`; verificar con `npm run typecheck --workspace @tolochahome/web`.
- [x] 2.2 En `apps/web/src/pages/Home.tsx`, integrar el botón «Añadir enlace rápido» (`<IconoMas />`, `aria-expanded`, `min-h-[44px] min-w-[44px]`) junto a los controles superiores de la portada cuando `listaGrupos.length > 0`, preseleccionando al abrir el grupo activo en disposición «Barra» (si es un grupo real) o el primer grupo, y conectando el envío con `usePrevisualizar()` (con respaldo a `dominioDe(url)` y favicon si falla o no devuelve título) seguido de `useCrearFavorito()`; verificar con `npm run typecheck --workspace @tolochahome/web` y `npm run lint`.

## 3. Verificación final

- [x] 3.1 Ejecutar `npm run verify` (`typecheck`, `lint`, `test` y `build`) y comprobar que todo termina sin errores.

## Workflow follow-up

- Sincronizar la delta de `specs/navegacion/spec.md` y archivar el change.
- Commitear todos los cambios (código + specs) en la rama `dev` y verificar que `git status` queda limpio.
