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

- **`ci`**: en `push` a `dev`/`main` y PR a `dev`/`main`. Usa concurrencia con
  cancelación en PR y `dev`; en `main` nunca cancela.
  - `changes` se ejecuta siempre: valida OpenSpec y detecta si el cambio toca
    código o Docker.
  - `quality` ejecuta `npm audit`, typecheck, lint, tests y build solo si hay
    código. Los cambios solo de docs/openspec se quedan en `changes`.
  - `docker` hace smoke de la imagen solo si cambian `Dockerfile`, entrypoint,
    lockfile, `tsconfig` o migraciones. No construye Docker en cada push.
  - `release` solo corre en push a `main` **después de `quality`**: decide el
    bump, construye una única imagen, la prueba, la escanea con Trivy y publica
    el commit/tag y la imagen.
  - `ci-ok` agrega el resultado; es el check estable para un futuro ruleset.
- **Versionado**: solo al liberar en `main`. `scripts/determine-bump.js` decide
  `major|minor|patch` desde el último tag y `scripts/bump.js` actualiza root,
  workspaces y `package-lock.json`, crea `chore(release): vX.Y.Z` y el tag.
  Ya no hay workflow `version` ni bump por merge a `dev`.
- **GHCR**: `:latest`, `:vX.Y.Z`, `:vX.Y` y `:node<versión>` solo desde `main`.
  No se publican `:pr-<n>` ni imágenes desde `dev`. Si un release falla tras
  publicar el commit/tag (por ejemplo, al subir la imagen), una re-ejecución
  reutiliza el tag de `HEAD` y reconstruye la misma versión.
- **`release-node`**: cada 6 horas compara la última `24.x` de
  `nodejs.org/dist/index.json` con el Node de `:latest`; si cambió, reconstruye
  y publica `:latest` y `:node<versión>` sin tocar la versión de la app.
  Manual: `gh workflow run release.yml -f force=true`.
- **`security`**: escanea `:latest` con Trivy a diario (HIGH/CRITICAL, solo
  vulnerabilidades con fix). También se puede lanzar a mano.
- **`cleanup`**: semanal borra versiones de GHCR cuyos tags sean solo `pr-*`
  o el `:dev` obsoleto, con más de 7 días. No toca `:latest`, semver ni
  `:node<ver>`. Se puede lanzar a mano con `dry_run` para revisar antes.
- **Ruleset**: `ci-ok` es el check estable para exigir CI en `main`. Si se
  activa un ruleset, el push del commit/tag de versión que hace el job
  `release` con `GITHUB_TOKEN` necesita un bypass o un PAT; no se configura
  automáticamente desde el workflow.

## Dependencias y seguridad

- **Dependabot** abre PRs cada lunes con las actualizaciones de `npm`
  (producción y desarrollo agrupadas por parches/menores) y de las GitHub
  Actions. Las alertas y las actualizaciones de seguridad están activadas en
  el repositorio, así que un aviso nuevo genera su PR sin esperar a la revisión
  semanal.
- **CI** ejecuta `npm audit --omit=dev --audit-level=high`: si aparece una
  vulnerabilidad alta o crítica en dependencias de producción, el pipeline
  falla y el release no publica hasta resolverla.
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

El versionado normal lo hace el job `release` al fusionar en `main`. Los
scripts `release:*` quedan solo para una emergencia en la que ese job no pueda
ejecutarse; en ese caso hay que crear el tag sobre `main` y construir la imagen
a mano:

```bash
npm run release:spec   # minor
npm run release:fix    # patch
npm run release:major  # major
git push origin main --follow-tags
```

**A prueba de `openspec update`**: las reglas de release viven en `AGENTS.md`
(que openspec no regenera). Si un update borra pasos de algún skill,
se re-aplican a mano desde `AGENTS.md`.
