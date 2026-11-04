# Design

## Context

Ver `proposal.md` — Why. Hoy `.github/workflows/ci.yml` contiene `changes`, `quality`, `docker`, `release` y `ci-ok`. El job `release` se ejecuta en cada push a `main` con código: decide el bump con `scripts/determine-bump.js`, ejecuta `scripts/bump.js`, construye y escanea la imagen y, solo si todo pasa, empuja el commit/tag con la deploy key `RELEASE_DEPLOY_KEY` y publica en GHCR.

`.github/workflows/release.yml` (`release-node`) reconstruye cada 6 horas `:latest` desde `main`, no desde la última release. `.github/workflows/cleanup.yml` borra tags `pr-*` y `:dev` que el pipeline ya no publica. `security.yml` escanea a diario pero no sube los resultados a code scanning.

TolochaRadio separa responsabilidades: `ci.yml` valida, `release.yml` publica con un tag `v*` y un `preflight` que exige `main` + CI verde, `node-image.yml` mantiene la base de la última release y `security.yml` sube SARIF. No hay cleanup porque no se publican tags de integración.

## Goals / Non-Goals

**Goals:**

- Publicar la imagen solo desde `main` y solo para una release etiquetada con CI verde.
- Sacar el release de `ci.yml` para que la CI no escriba en el repositorio ni necesite deploy key.
- Evitar que `:latest` contenga código sin liberar.
- Reducir workflows y ejecuciones: sin release en CI, sin limpieza de tags inexistentes, sin builds de imagen en `dev`.
- Mantener el contrato de versionado semver y los tags `:latest`, `:vX.Y.Z`, `:vX.Y` y `:node<versión>`.

**Non-Goals:**

- Cambiar la aplicación, la API, la base de datos o las dependencias.
- Cambiar el ruleset `main-ci` ni el check `ci-ok`.
- Añadir auto-merge, releases automáticas de GitHub ni retención automática de imágenes.
- Cambiar el esquema de tags de las imágenes.

## Decisions

### 1. Release por tag con preflight, no por push a `main`

`release.yml` se dispara con `push: tags: v*`. Un job `preflight` comprueba que el tag apunta a un commit de `main` y espera a que el check `quality` de ese commit termine en verde. El job `release` construye una sola imagen, la escanea con Trivy y le hace smoke test antes de publicar.

- **Por qué:** el tag es el artefacto de release y el preflight hace imposible publicar desde una rama sin fusionar. La CI deja de necesitar `contents: write` y la deploy key.
- **Alternativas descartadas:** mantener el job `release` en `ci.yml` (acopla CI y publicación, obliga a la deploy key y mezcla el bump con la validación); usar `workflow_dispatch` para publicar (se puede lanzar desde cualquier rama y no deja un artefacto inmutable).

### 2. El bump y el tag se crean a mano en `main`

Tras fusionar en `main`, se ejecuta `node scripts/bump.js minor|patch|major` (o `npm run release:spec|fix|major`), se empuja `main`, se espera a `quality` y se empuja el tag. `scripts/bump.js` crea el commit `chore: release vX.Y.Z` y el tag; ya no hay `determine-bump.js` ni bump automático desde la CI.

- **Por qué:** es el flujo de TolochaRadio, deja el commit y el tag en el historial antes de publicar y permite decidir el bump con contexto humano.
- **Alternativa descartada:** que la CI decida el bump desde los commits; funciona, pero exige escribir en `main`, usar una deploy key y duplica la lógica de versionado.

### 3. `ci.yml` solo valida

`changes` usa `dorny/paths-filter` para decidir si hay código y si se toca la imagen. `quality` ejecuta `npm audit`, typecheck, lint, tests y build; se salta en PR `dev→main` porque el mismo SHA ya se validó en `dev`. `docker` solo corre en PRs que tocan `Dockerfile`, entrypoint, lockfile, `tsconfig` o migraciones. `ci-ok` agrega los resultados para el ruleset.

- **Por qué:** la imagen definitiva la construye y prueba el release; no hace falta construirla en cada push a `dev`. El skip de `quality` en `dev→main` evita duplicar la validación.
- **Alternativas descartadas:** mantener el script bash de detección (más código propio que mantener); construir la imagen en cada push (gasta minutos y no aporta al release).

### 4. `node-image.yml` mantiene la última release, no `main`

Se ejecuta al cambiar `.nvmrc` o el propio workflow, a diario y a mano. Compara la última `24.x` de `nodejs.org` y el digest de `node:24-alpine` con los labels `org.opencontainers.image.base.name` y `org.opencontainers.image.base.digest` de `:latest`. Si cambia algo, resuelve el último tag `v*` contenido en `main`, hace checkout de ese tag y republica `:latest` y `:node<versión>` con la nueva base.

- **Por qué:** `:latest` debe ser código liberado; reconstruir desde `main` puede publicar commits sin release. Comparar también el digest detecta cambios de Alpine que no cambian la versión de Node.
- **Alternativas descartadas:** mantener la comprobación actual de `node -v` desde `main` (puede publicar código sin liberar y no detecta cambios de la base); usar solo la versión de Node (se pierden parches de Alpine).

### 5. Seguridad con SARIF y sin cleanup

`security.yml` escanea `:latest` a diario con Trivy y sube el SARIF a code scanning. Se elimina `cleanup.yml` porque no se publican tags `pr-*` ni `:dev`; la retención de las últimas 10 releases es manual.

- **Por qué:** el SARIF da visibilidad en la pestaña de seguridad; el cleanup actual no tiene nada que borrar.
- **Alternativa descartada:** mantener el cleanup “por si acaso”; añade un workflow y una ejecución semanal sin efecto.

## Risks / Trade-offs

- **La imagen no se publica sola al fusionar:** hay que ejecutar el bump y empujar el tag. Es el precio de que el release sea auditable y de que la CI no escriba en `main`; queda documentado en `AGENTS.md` y `docs/desarrollo.md`.
- **El preflight espera el check `quality`:** si el CI del commit de release tarda más de 10 minutos o se salta, el release falla sin publicar. Mitigación: el commit de release cambia `package.json`/lockfile, así que `quality` se ejecuta; el preflight reintenta 60 veces cada 10 segundos.
- **El tag puede apuntar a un commit antiguo con CI verde:** el preflight acepta cualquier commit de `main` con `quality` verde. Es el comportamiento de TolochaRadio; el tag lo crea el mantenedor sobre el commit de release.
- **`:latest` y `:vX.Y.Z` pueden diferir tras un `node-image`:** el tag semver conserva la imagen original y `:latest` se reconstruye con la base nueva; es intencional y está documentado.
- **Sin cleanup, las imágenes antiguas se acumulan:** retención manual de las últimas 10 releases; el paquete de GHCR no se borra automáticamente.

## Migration Plan

- El primer release con el flujo nuevo se hace después de fusionar este change: `node scripts/bump.js patch`, push de `main`, esperar `quality` y push del tag.
- La deploy key `RELEASE_DEPLOY_KEY` deja de usarse; el secreto puede eliminarse cuando ya no haya ejecuciones antiguas.
- No hay migración de datos, API ni configuración de la aplicación.
- Rollback: restaurar los workflows anteriores y el job `release` de `ci.yml`; el historial y las imágenes publicadas no se tocan.
