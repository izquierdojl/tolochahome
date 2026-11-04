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

## CI/CD y versionado

- **`ci`**: en `push` a `dev`/`main` y PR a `dev`/`main`. Usa concurrencia con
  cancelación en PR y `dev`; en `main` nunca cancela.
  - `changes` valida OpenSpec y usa `dorny/paths-filter` para detectar si el
    cambio toca código o Docker.
  - `quality` ejecuta `npm audit`, typecheck, lint, tests y build solo si hay
    código. Se salta en PR `dev→main` porque el mismo SHA ya se validó en `dev`.
  - `docker` construye, prueba y escanea la imagen solo en PRs que tocan
    `Dockerfile`, entrypoint, lockfile, `tsconfig` o migraciones. No construye
    Docker en cada push ni publica imágenes desde integración.
  - `ci-ok` agrega el resultado; es el check del ruleset `main-ci`.
- **Versionado**: después de fusionar en `main`, ejecutar
  `node scripts/bump.js minor|patch|major` (o `npm run release:spec|fix|major`).
  El script actualiza root, workspaces y `package-lock.json`, crea
  `chore: release vX.Y.Z` y el tag. Después:
  `git push origin main`, esperar a que `quality` esté verde y
  `git push origin --tags`.
- **`release`**: se dispara con el tag `v*`. `preflight` comprueba que el tag
  está en `main` y que `quality` está verde; después construye una sola imagen,
  la prueba, la escanea con Trivy y publica `:latest`, `:vX.Y.Z`, `:vX.Y` y
  `:node<versión>`. Si el tag no está en `main` o el CI falla, no publica.
- **`node-image`**: mantiene la base Node/Alpine de la última release. Se
  ejecuta al cambiar `.nvmrc` o el workflow, a diario y a mano. Compara la
  última `24.x` y el digest de `node:24-alpine` con los labels de `:latest`;
  si cambia, reconstruye el tag de la última release (nunca `main`) y publica
  `:latest` y `:node<versión>`. Manual:
  `gh workflow run node-image.yml --ref main -f force=true`.
- **`security`**: escanea `:latest` a diario con Trivy y sube los resultados
  a code scanning (SARIF). También se puede lanzar a mano.
- **Retención**: no hay cleanup automático; mantener las últimas 10 releases
  desde la configuración del paquete en GHCR.
- **Ruleset**: `main-ci` exige `ci-ok` en `main`. El usuario puede saltarlo
  para empujar el commit/tag de release; ya no se usa deploy key.

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

El versionado normal es manual, después de fusionar en `main`:

```bash
npm run release:spec   # minor
npm run release:fix    # patch
npm run release:major  # major
git push origin main
# esperar a que el check quality del commit esté verde
git push origin --tags
```

El tag `v*` dispara `release` → GHCR. El `preflight` no publica si el tag no
está en `main` o si `quality` no está verde.

**A prueba de `openspec update`**: las reglas de release viven en `AGENTS.md`
(que openspec no regenera). Si un update borra pasos de algún skill,
se re-aplican a mano desde `AGENTS.md`.
