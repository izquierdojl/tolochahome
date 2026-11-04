# Proposal

## Why

El pipeline actual concentra validación y release en `ci.yml`: el job `release` decide la versión, empuja un commit y un tag con una deploy key y publica la imagen. Eso acopla CI y publicación, obliga a mantener permisos de escritura en el CI y deja workflows con responsabilidades solapadas: `release.yml` reconstruye desde `main`, `cleanup.yml` limpia tags que ya no se publican y `scripts/determine-bump.js` solo existe para el job de release.

TolochaRadio ya usa un modelo más simple y auditable: la CI valida, un workflow de release por tag publica solo desde `main` después de comprobar que el CI del commit está en verde, y otro workflow mantiene la base Node de la última release. Este change traslada ese modelo a TolochaHome.

## What Changes

- `ci.yml` pasa a validar únicamente: `changes`, `quality`, `docker` (solo PRs que tocan la imagen) y `ci-ok`. Sin job `release`.
- `release.yml` se dispara con tags `v*`: comprueba que el tag está en `main` y que `quality` está verde para ese commit; construye una sola imagen, la escanea y la prueba antes de publicar `:latest`, `:vX.Y.Z`, `:vX.Y` y `:node<versión>`.
- `node-image.yml` sustituye al actual `release.yml` de Node: compara la última `24.x` y el digest de `node:24-alpine` con los labels de `:latest`, y reconstruye el tag de la última release (nunca `main`), publicando `:latest` y `:node<versión>`.
- `security.yml` sube el escaneo diario de Trivy a code scanning (SARIF).
- Se elimina `cleanup.yml`: no se publican tags `pr-*` ni `:dev`; la retención pasa a ser manual (últimas 10 releases).
- Se actualizan `AGENTS.md` y `docs/desarrollo.md`: tras fusionar en `main`, ejecutar `node scripts/bump.js <bump>`, push de `main`, esperar el CI y push de tags.
- Se elimina `scripts/determine-bump.js`, que solo usaba el job `release` de `ci.yml`.
- Se ajusta el requisito de `despliegue` sobre la reconstrucción de Node para reflejar que usa la última release, no `main`, y se añade el contrato de publicación por tag desde `main`.

## Capabilities

### New Capabilities

<!-- Ninguna: el cambio vive en la capacidad existente de despliegue. -->

### Modified Capabilities

- `despliegue`: se modifica la comprobación periódica (diaria, versión de Node y digest de la base), la etiqueta de la release (por tag) y la publicación desde `main` (reconstruye la última release, nunca `main`); se añade el requisito de publicación por tag `v*` solo desde `main` y con CI verde.

## Impact

- `.github/workflows/ci.yml`: eliminación del job `release` y simplificación de la detección de cambios.
- `.github/workflows/release.yml`: release por tag.
- `.github/workflows/node-image.yml`: mantenimiento de la base Node/Alpine.
- `.github/workflows/security.yml`: SARIF y code scanning.
- `.github/workflows/cleanup.yml`: eliminado.
- `scripts/determine-bump.js`: eliminado; `scripts/bump.js` sigue siendo el punto de entrada manual.
- `AGENTS.md`, `docs/desarrollo.md`, `openspec/specs/despliegue/spec.md`: documentación y contrato.
- Sin cambios en la aplicación, la API, la base de datos ni las dependencias.
- Verificación: parseo de los YAML, `actionlint` si está disponible, `npm run verify`, `openspec validate` y revisión de los triggers. La primera release con el flujo nuevo se valida al etiquetar la próxima versión.
