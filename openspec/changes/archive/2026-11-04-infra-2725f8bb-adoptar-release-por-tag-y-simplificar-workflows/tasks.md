# Tasks

## 1. Simplificar la CI

- [x] 1.1 En `.github/workflows/ci.yml`, eliminar el job `release`, usar `dorny/paths-filter` para `code`/`docker`, dejar `quality` con el skip de PR `dev→main`, `docker` solo en PRs que tocan imagen y ajustar `ci-ok`; validar con `actionlint` o parseo YAML.
- [x] 1.2 Eliminar `.github/workflows/cleanup.yml` y `scripts/determine-bump.js`; comprobar que no quedan referencias en workflows, `package.json`, `AGENTS.md` ni `docs/`.
- [x] 1.3 Ajustar `scripts/bump.js` para que el commit sea `chore: release vX.Y.Z` (sin `[skip ci]`), igual que TolochaRadio; verificar que `npm run release:spec|fix|major` sigue funcionando.

## 2. Release y mantenimiento de la imagen

- [x] 2.1 Reescribir `.github/workflows/release.yml` con trigger `push: tags: v*`, `preflight` (tag en `main` + `quality` verde) y publicación de `:latest`, `:vX.Y.Z`, `:vX.Y` y `:node<versión>` tras build, Trivy y smoke; validar con `actionlint`.
- [x] 2.2 Crear `.github/workflows/node-image.yml` con triggers push a `main` (`.nvmrc`/workflow), schedule diario y `workflow_dispatch` con `force`; comparar Node 24.x y digest de `node:24-alpine` con los labels de `:latest`, reconstruir el último tag de release y publicar `:latest`/`:node<versión>`.
- [x] 2.3 Actualizar `.github/workflows/security.yml` a SARIF + code scanning con `security-events: write`; mantener el disparo diario y manual.

## 3. Documentación y contrato

- [x] 3.1 Actualizar `AGENTS.md` §8 y `docs/desarrollo.md` con el flujo manual (`bump.js` en `main` → push `main` → esperar CI → push tags), `node-image.yml`, seguridad SARIF y retención manual.
- [x] 3.2 Validar el delta de `despliegue` con `openspec validate --strict` y sincronizar la spec principal al archivar.
- [x] 3.3 Ejecutar `npm run verify`, `scripts/check_changes.sh` y `openspec validate --strict`; revisar `git diff --check` y `git status`.

## Workflow follow-up

- Commitear el change y los workflows en `dev` antes de archivar; verificar `git status`.
- Tras fusionar a `main`, ejecutar `node scripts/bump.js patch` (o el bump que corresponda), push de `main`, esperar `quality` verde y push del tag; comprobar que `release` publica la imagen.
