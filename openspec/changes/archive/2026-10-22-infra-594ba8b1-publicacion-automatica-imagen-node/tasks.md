# Tasks

## 1. Change OpenSpec

- [x] 1.1 Crear el change `infra-594ba8b1-publicacion-automatica-imagen-node` con `meta.yaml`, `proposal.md`, `design.md` y la delta de la capability `despliegue`.
- [x] 1.2 Validar el change con `bash scripts/check_changes.sh`.

## 2. Workflow de comprobación y publicación

- [x] 2.1 Añadir `schedule` (cada 6 h) y `workflow_dispatch` (con opción `force`) a `.github/workflows/release.yml`.
- [x] 2.2 Añadir el job `check`: obtener la última `24.x` de `https://nodejs.org/dist/index.json`, leer `node -v` de la imagen `:latest` y publicar los outputs `needed` y `version`.
- [x] 2.3 Condicionar el job `release` a `needed == 'true'` en ejecuciones programadas o manuales, manteniendo el comportamiento actual en push y PR.
- [x] 2.4 Hacer `checkout` explícito de `main` en ejecuciones programadas o manuales (la rama por defecto del repo es `dev`).
- [x] 2.5 Calcular las etiquetas: `:latest` + `:node<versión>` en programado/manual, y añadir `:node<versión>` a las releases por push a `main`.
- [x] 2.6 Pasar `NODE_VERSION` como `build-arg` para que la imagen construida coincida con la etiqueta `:node<versión>`.

## 3. Dockerfile y documentación

- [x] 3.1 Añadir `ARG NODE_VERSION=24` y usar `node:${NODE_VERSION}-alpine` en las etapas `deps` y `runtime` del `Dockerfile`.
- [x] 3.2 Documentar el flujo programado, la etiqueta `:node<versión>` y el disparo manual en `docs/desarrollo.md`.
- [x] 3.3 Actualizar la sección de release de `AGENTS.md` §8.

## 4. Verificación

- [x] 4.1 Construir la imagen con `docker build --build-arg NODE_VERSION=24.22.1 -t tolochahome:node-test .` y comprobar con `docker run --rm --entrypoint node tolochahome:node-test -v` que devuelve `v24.22.1`.
- [x] 4.2 Ejecutar `bash scripts/check_changes.sh`, `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`.
- [x] 4.3 Validar la sintaxis del workflow con `actionlint` (release.yml sin avisos; `ci.yml` conserva avisos previos de shellcheck) y revisar `git diff`.
- [x] 4.4 Tras el merge a `main`, lanzar el workflow a mano (`gh workflow run release.yml --ref main`) y comprobar que no republica si Node ya está al día; probar `-f force=true` y verificar la etiqueta `:node24.22.1`.

## Workflow follow-up

- Commitear el código y los artefactos del change en `dev` antes de archivar; verificar con `git status` que no queda nada sin commitear.
- Archivar el change con `/opsx-archive` cuando la revisión esté aprobada y sincronizar `openspec/specs/despliegue/spec.md`.
