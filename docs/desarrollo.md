# Desarrollo y release

> [← Volver al README](../README.md)

## Comandos

```bash
npm run typecheck    # todos los workspaces
npm run lint         # todos los workspaces
npm test             # API (vitest + supertest)
npm run build        # API (dist/) + web (dist/)
npm start            # API compilada (sirve la web si STATIC_DIR apunta a ella)
```

DB manual (`@tolochahome/api`):

```bash
npm run db:generate
npm run db:migrate
```

Docker tras cambios de backend:

```bash
docker compose up --build -d
curl -fsS http://127.0.0.1:3000/api/v1/health
curl -fsS http://127.0.0.1:3000/ | head
```

La imagen acepta `--build-arg NODE_VERSION=<x.y.z>` para fijar la versión exacta
de Node; por defecto usa la línea 24 (último parche disponible al construir).

## OpenSpec (resumen)

Crear changes con `scripts/new_change.sh <tipo> "<título>" [rama]`
(`feature|bug|docs|infra|refactor|test|chore`, nombre `<tipo>-<id8>-<slug>`,
`meta.yaml` con `tipo,id,titulo,autor,fecha,branch`). Valida con
`bash scripts/check_changes.sh` (también en CI). Ramas: `main` producción,
`dev` integración y destino de PR. `DEFAULT_BRANCH=dev`. Detalle en `AGENTS.md` §7.

Al aplicar un change, sincronizar `todowrite` con el `tasks.md`.
Archivar = commitear TODO (código + specs) antes del merge; comprobar `git status`.

## CI/CD y versionado automático

- **`ci`**: en `push` a `dev`/`main` y PR a `dev`/`main`: valida changes,
  typecheck, lint, tests, build y smoke Docker (`/api/v1/health` + `/`).
- **`version`**: al hacer merge/push a `dev` (salvo `chore(release):`),
  `scripts/determine-bump.js` decide `major|minor|patch` desde los commits
  y `node scripts/bump.js <bump>` crea commit `chore(release): vX.Y.Z` + tag.
- **`release`**: publica en GHCR con push o PR a `main`. En push a `main`
  publica `:latest`, `:vX.Y.Z`, `:vX.Y` (versión de `package.json`) y
  `:node<versión>`; en PR a `main`, `:pr-<n>`. Desde `dev` ni por tags no se
  publica imagen.
- **`release` programado**: cada 6 horas compara la última `24.x` de
  `nodejs.org/dist/index.json` con el Node que contiene la imagen `:latest`.
  Si hay una versión nueva, reconstruye y publica `:latest` y `:node<versión>`,
  sin tocar `:vX.Y.Z` ni la versión de `package.json`. También se puede lanzar
  a mano (`gh workflow run release.yml --ref main`) y forzar la republicación
  con `-f force=true`.

## Dependencias y seguridad

- **Dependabot** abre PRs cada lunes con las actualizaciones de `npm`
  (producción y desarrollo agrupadas por parches/menores) y de las GitHub
  Actions. Las alertas y las actualizaciones de seguridad están activadas en
  el repositorio, así que un aviso nuevo genera su PR sin esperar a la revisión
  semanal.
- **CI** ejecuta `npm audit --omit=dev --audit-level=high`: si aparece una
  vulnerabilidad alta o crítica en dependencias de producción, el pipeline
  falla y no se puede fusionar sin resolverla.
- Revisar y actualizar a mano cuando toque:

  ```bash
  npm audit                  # informe completo (producción + desarrollo)
  npm audit fix              # parches compatibles
  npm outdated               # versiones disponibles
  ```

- `package.json` incluye un `overrides` que fuerza `esbuild@0.25.12` dentro de
  `@esbuild-kit/core-utils` (dependencia de `drizzle-kit`). Es la única forma de
  dejar el audit a cero sin bajar `drizzle-kit`; se probó que `drizzle-kit
  generate` sigue funcionando. Revisar el override al actualizar `drizzle-kit`.

Reglas semver (`AGENTS.md` §8):

| Situación | Bump |
| --- | --- |
| `feat` / tipo `feature` | `minor` |
| `fix` / `bug` | `patch` |
| `BREAKING CHANGE` / `!` | `major` |
| `infra/docs/refactor/test/chore` | `patch` salvo `BREAKING` |

Manual si hace falta:

```bash
npm run release:spec   # minor
npm run release:fix    # patch
npm run release:major  # major
git push origin dev && git push origin --tags
```

**A prueba de `openspec update`**: las reglas de release viven en `AGENTS.md`
(que openspec no regenera). Si un update borra pasos de algún skill,
se re-aplican a mano desde `AGENTS.md`.
