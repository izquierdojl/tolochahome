# Design

## Contexto

`release.yml` publica en GHCR solo con push o PR a `main`. El `Dockerfile` usa `node:24-alpine`, que apunta siempre al último parche de la línea 24, pero la imagen solo se reconstruye cuando cambia el código. GitHub no tiene un evento nativo para releases de Node, así que la detección tiene que ser por sondeo.

La rama por defecto del repositorio es `dev`, y los workflows programados se ejecutan desde la rama por defecto. Por eso el job programado debe hacer `checkout` explícito de `main`.

## Decisiones

### 1. Sondeo cada 6 horas en el propio `release.yml`

Se añade `schedule` (`23 */6 * * *`) y `workflow_dispatch` al workflow existente en lugar de crear uno nuevo. Así la lógica de login, tags y build no se duplica y no hay que compartir secretos entre workflows.

La comprobación consulta `https://nodejs.org/dist/index.json` (fuente oficial, incluye el campo `lts`) y filtra la última `24.x`. No se usa la API de Docker Hub porque la imagen publicada ya dice qué Node lleva dentro.

### 2. Comparar contra la imagen `:latest`, no contra el repositorio

El job `check` ejecuta `docker run --rm --entrypoint node <imagen>:latest -v` y compara con la última `24.x`. Esto detecta exactamente lo que importa: la imagen que los usuarios descargan. Si la imagen no existe o no se puede leer, se trata como desactualizada y se reconstruye.

Un job `check` separado permite que el job `release` siga siendo el único que construye y publica, y que en push/PR se salte la comprobación.

### 3. Versión exacta como `build-arg`

`Dockerfile` declara `ARG NODE_VERSION=24` antes del primer `FROM` y usa `node:${NODE_VERSION}-alpine` en las dos etapas. Los builds normales mantienen el comportamiento actual (último 24.x al construir); el build programado pasa la versión exacta detectada, de modo que la etiqueta `:node24.22.1` corresponde de verdad a lo que contiene la imagen.

### 4. Etiquetas

- Push a `main`: `:latest`, `:vX.Y.Z`, `:vX.Y` y `:node<versión>`.
- PR a `main`: `:pr-<n>` (sin cambios).
- Programado o manual con novedad: `:latest` y `:node<versión>`. No se reescriben `:vX.Y.Z` ni `:vX.Y`, que quedan ligadas a la release de código.
- Manual con `force`: republica aunque la versión coincida, útil para reaccionar a un aviso sin esperar al ciclo.

### 5. Sin auto-merge ni cambios de versión

La actualización de Node no toca `package.json` ni crea commits ni tags de versión: es un cambio de imagen base, no de la aplicación. Esto evita ruido en `version.yml` y mantiene el versionado semántico para cambios de código.

## Alternativas descartadas

- **Renovate/Dependabot**: Renovate detecta tags nuevos de Docker, pero exige instalar la app y abre PRs que hay que fusionar; no publica la imagen directamente. Dependabot no actualiza etiquetas flotantes como `24-alpine`.
- **Fijar la versión exacta en el Dockerfile y actualizarla por PR**: más auditable, pero añade commits y revisiones para un parche de seguridad; se puede adoptar más adelante sin cambiar el workflow.
- **Reconstruir siempre en cada ejecución programada**: más simple, pero genera una imagen nueva cada 6 horas aunque no haya cambios y provoca actualizaciones innecesarias en quien use `:latest`.

## Riesgos

- GitHub puede retrasar o saltarse ejecuciones programadas; el retraso esperado es de minutos, no garantizado. Para una CVE crítica existe `workflow_dispatch`.
- Publicar `:latest` sin revisión cambia la base de la imagen (Node y paquetes de Alpine). Es aceptable porque no cambia código de la aplicación y el objetivo es el parche de seguridad; si se prefiere revisión, basta con no publicar `:latest` en el job programado.
- La comparación depende de que `node -v` funcione en la imagen; si el entrypoint o la imagen cambian, la comprobación falla de forma visible y no publica nada.
