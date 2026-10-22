# Tasks

## 1. Change OpenSpec

- [x] 1.1 Crear el change `infra-0d5fc4b5-seguridad-dependencias` con `meta.yaml`, `proposal.md`, `design.md` y la delta de la capability `dependencias`.
- [x] 1.2 Validar el change con `bash scripts/check_changes.sh` y `openspec validate`.

## 2. Actualización de dependencias vulnerables

- [x] 2.1 Actualizar `drizzle-orm` a `^0.45.4` en `apps/api/package.json` (advisory alta GHSA-gpj5-g38j-94v9).
- [x] 2.2 Actualizar `vitest` a `^5.0.5` en `apps/api/package.json` para eliminar `tinypool`, `vite@5`, `vite-node` y `@vitest/mocker` vulnerables.
- [x] 2.3 Actualizar `vite` a `^6.4.5` en `apps/web/package.json` y `concurrently` a `^9.2.5` en la raíz.
- [x] 2.4 Añadir el `overrides` de `esbuild@0.25.12` para `@esbuild-kit/core-utils` y verificar que `npx drizzle-kit generate` sigue funcionando sin migraciones nuevas.
- [x] 2.5 Regenerar `package-lock.json`, comprobar `npm ci` y confirmar `npm audit` con 0 vulnerabilidades.

## 3. Automatización y CI

- [x] 3.1 Añadir `.github/dependabot.yml` para `npm` (producción y desarrollo agrupados) y `github-actions`, con revisión semanal.
- [x] 3.2 Añadir `npm audit --omit=dev --audit-level=high` al job de calidad de `.github/workflows/ci.yml`.
- [x] 3.3 Activar en el repositorio las alertas de Dependabot, las actualizaciones de seguridad automáticas y el auto-merge.
- [x] 3.4 Crear la etiqueta `dependencias` usada por Dependabot.

## 4. Documentación y verificación

- [x] 4.1 Documentar dependencias y seguridad en `docs/desarrollo.md` y `AGENTS.md` §2.
- [x] 4.2 Ejecutar `npm run typecheck`, `npm run lint`, `npm run test` (102 tests) y `npm run build`.
- [x] 4.3 Validar la sintaxis de `ci.yml` y `dependabot.yml` con `actionlint`/YAML y revisar `git diff`.
- [x] 4.4 Tras el merge a `dev`, comprobar que CI pasa con la auditoría y que Dependabot abre el primer PR en la siguiente revisión semanal o ante un aviso de seguridad.

## Workflow follow-up

- Commitear el código, los workflows y los artefactos del change en `dev` antes de archivar; verificar con `git status` que no queda nada sin commitear.
- Archivar el change con `/opsx-archive` cuando la revisión esté aprobada y sincronizar `openspec/specs/dependencias/spec.md`.
