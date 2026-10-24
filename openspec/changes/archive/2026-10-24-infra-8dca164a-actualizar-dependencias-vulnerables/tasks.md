# Tasks

## 1. Actualización de dependencias

- [x] 1.1 Actualizar `express`, `multer` y `zod` en `apps/api/package.json`, regenerar `package-lock.json` y verificar con `npm ls` que `body-parser` queda en 2.4.0 o superior.
- [x] 1.2 Ejecutar `npm audit --omit=dev --audit-level=high` y verificar que no quedan vulnerabilidades altas ni críticas.
- [x] 1.3 Adaptar el código de la API a Zod 4 solo si typecheck o los tests detectan incompatibilidades; verificar con `npm run typecheck` y `npm run test` que los contratos se mantienen.

## 2. Verificación e integración

- [x] 2.1 Ejecutar desde la raíz `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`; verificar que todos terminan sin errores y que el lockfile es reproducible.
- [x] 2.2 Revisar `git diff --check` y `git status --short`; verificar que solo cambian dependencias, lockfile, adaptaciones estrictamente necesarias y artefactos de este change.

## Workflow follow-up

- Archivar el change en la rama de trabajo antes de fusionar el PR de dependencias en `dev`.
- Fusionar el PR de dependencias en `dev`, comprobar que el PR #24 recibe el commit y vuelve a ejecutar CI.
- Fusionar el PR #24 en `main` y verificar las imágenes `:latest`, `:v0.13.3` y `:v0.13`.
