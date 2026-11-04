# Tasks

## 1. Ciclo de vida de la supresión de click

- [x] 1.1 En `apps/web/src/pages/Home.tsx`, sustituir el booleano `suprimirClick` por una marca temporal de supresión (`performance.now()` + ventana corta) y limpiarla al iniciar un gesto táctil válido; verificar con `npm run typecheck --workspace @tolochahome/web` que compila.
- [x] 1.2 Ajustar `capturarClick` para suprimir y reiniciar la marca solo mientras esté vigente; verificar que un toque normal sobre un enlace sigue abriéndolo según la preferencia de apertura.
- [x] 1.3 Mantener la supresión del click del propio arrastre (incluido el corto y el que no tiene grupo contiguo) sin que afecte al toque siguiente; verificar que el panel no queda en un estado que descarte clics.

## 2. Verificación manual y regresión

- [x] 2.1 En viewport móvil, comprobar: deslizamiento que cambia de grupo + un toque -> abre; arrastre corto (<50 px) + un toque -> abre; arrastre hacia un extremo sin vecino + un toque -> abre; toque en «abrir todos» tras un arrastre -> responde.
- [x] 2.2 Repetir con `prefers-reduced-motion` activo y con un toque normal sin arrastre; verificar que la animación, la selección de grupo y la apertura de enlaces no cambian.
- [x] 2.3 Ejecutar desde la raíz `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`; verificar que los cuatro terminan sin errores.
- [x] 2.4 Revisar `git diff --check` y `git status --short`; verificar que no hay errores de formato y que el único archivo de implementación modificado es `apps/web/src/pages/Home.tsx` (los artefactos del change están ignorados por `.gitignore` hasta el archivo).

## Workflow follow-up

- Commitear la implementación en `dev` antes de archivar y verificar con `git status` que no queda código sin commitear.
- Tras la revisión, archivar con `/opsx-archive`, sincronizar `openspec/specs/navegacion/spec.md` y verificar el resultado archivado.
