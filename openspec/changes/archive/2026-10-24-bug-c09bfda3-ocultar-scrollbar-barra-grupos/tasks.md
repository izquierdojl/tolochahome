# Tasks

## 1. Ajuste visual de la barra de grupos

- [x] 1.1 En `apps/web/src/components/BarraGrupos.tsx`, mantener `overflow-x-auto` y añadir `[scrollbar-width:none]` y `[&::-webkit-scrollbar]:hidden` al `tablist`, sin modificar los botones ni los manejadores; verificar con `npm run typecheck --workspace @tolochahome/web` que el componente compila.
- [x] 1.2 Probar la portada en disposición «Barra» con pestañas suficientes para desbordar y en temas claro y oscuro; verificar que no aparece la scrollbar, que el acento de la pestaña activa queda despejado y que no cambian otras zonas desplazables ni la disposición «Secciones».
- [x] 1.3 Con la barra desbordada, probar puntero o tacto y las teclas flechas, `Home` y `End` en viewport de escritorio y móvil; verificar que se puede llegar a todas las pestañas y que cada pestaña activa sigue desplazándose a la zona visible.

## 2. Verificación e integración

- [x] 2.1 Ejecutar desde la raíz `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`; verificar que los cuatro comandos terminan sin errores.
- [x] 2.2 Revisar `git diff --check` y `git status --short`; verificar que no hay errores de formato y que el único archivo de implementación modificado es `apps/web/src/components/BarraGrupos.tsx`, junto a los artefactos de este change.

## Workflow follow-up

- Commitear la implementación en `dev` antes de archivar y verificar con `git status` que no queda código sin commitear.
- Tras la revisión, archivar con `/opsx-archive`, sincronizar `openspec/specs/navegacion/spec.md` y verificar el resultado archivado.
