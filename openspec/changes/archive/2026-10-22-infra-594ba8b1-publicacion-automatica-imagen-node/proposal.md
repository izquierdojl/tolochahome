# Proposal

## Why

La imagen publicada en GHCR usa `node:24-alpine`, una etiqueta flotante, pero solo se reconstruye cuando hay un push o PR a `main`. Entre dos releases de la aplicación pueden pasar semanas y, mientras tanto, la imagen sigue ejecutando una versión de Node con vulnerabilidades ya corregidas. El caso reciente: la imagen `:latest` se construyó el 19 de octubre con Node 24.22.0 y el 21 de octubre Node publicó 24.22.1 con cuatro CVE altas; nadie reconstruyó la imagen.

Además, al usar una etiqueta flotante no queda registrado qué versión exacta de Node contiene cada imagen, así que no se puede auditar ni fijar una versión concreta.

## What Changes

- Añadir una comprobación programada (cada 6 horas) que compara la última versión `24.x` publicada en `nodejs.org/dist/index.json` con la versión de Node que contiene la imagen `:latest` de GHCR.
- Si coinciden, no se construye nada. Si hay una versión nueva, se reconstruye y se publica `:latest` y una etiqueta trazable `:node<versión>` (por ejemplo `:node24.22.1`).
- Permitir lanzar la comprobación a mano (`workflow_dispatch`), con opción de forzar la republicación.
- Pasar la versión exacta de Node como `build-arg` (`NODE_VERSION`) para que la imagen construida coincida con la etiqueta publicada, manteniendo `24` como valor por defecto para los builds normales.
- Mantener sin cambios el comportamiento actual de push y PR a `main` (`:latest`, `:vX.Y.Z`, `:vX.Y` y `:pr-<n>`), y no publicar desde `dev`.
- Documentar el nuevo flujo en `docs/desarrollo.md` y `AGENTS.md`.

## Capabilities

### New Capabilities

- `despliegue`: comprobación periódica de la versión de Node, reconstrucción condicionada de la imagen, etiquetado con la versión exacta y disparo manual.

### Modified Capabilities

<!-- Ninguna: no cambia el comportamiento de la aplicación ni de la release por versión. -->

## Impact

- `.github/workflows/release.yml`: nuevos disparadores `schedule` y `workflow_dispatch`, job de comprobación y etiquetas adicionales.
- `Dockerfile`: `ARG NODE_VERSION=24` usado en las dos etapas `FROM`, para poder fijar la versión exacta en el build programado.
- `docs/desarrollo.md` y `AGENTS.md` §8: documentación del flujo automático y de la etiqueta `:node<versión>`.
- Sin cambios en `apps/api`, `apps/web`, base de datos ni dependencias. No hay migraciones.
- Verificación: `bash scripts/check_changes.sh`, build de la imagen con `NODE_VERSION=24.22.1` y comprobación de `node -v` dentro de la imagen; el workflow se valida en la primera ejecución programada o manual.
