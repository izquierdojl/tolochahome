# Spec Delta

## ADDED Requirements

### Requirement: Publicación de la release por tag

La imagen de una versión SHALL publicarse solo cuando se empuja un tag `v*` que apunte a un commit de `main` con el check `quality` en verde. El pipeline SHALL construir una sola imagen, escanearla y probarla antes de publicar `:latest`, `:vX.Y.Z`, `:vX.Y` y `:node<versión>`, y no SHALL publicar imágenes desde `dev` ni desde pull requests.

#### Scenario: Tag en main con CI verde

- **WHEN** se empuja un tag `vX.Y.Z` sobre un commit de `main` cuyo check `quality` ha terminado en verde
- **THEN** se publica la imagen con `:latest`, `:vX.Y.Z`, `:vX.Y` y `:node<versión>`

#### Scenario: Tag fuera de main

- **WHEN** se empuja un tag `vX.Y.Z` que no apunta a un commit de `main`
- **THEN** el pipeline no publica ninguna imagen

#### Scenario: CI del commit en rojo

- **WHEN** el check `quality` del commit etiquetado no está en verde
- **THEN** el pipeline no publica ninguna imagen

## MODIFIED Requirements

### Requirement: Comprobación periódica de la versión de Node

El pipeline SHALL comprobar a diario la última versión publicada de la línea `24.x` de Node y el digest de `node:24-alpine` y compararlos con la versión y la base que declara la imagen `:latest` en GHCR. La comprobación SHALL usar `https://nodejs.org/dist/index.json` como fuente de la versión de Node y los labels `org.opencontainers.image.base.name` y `org.opencontainers.image.base.digest` de la imagen para la base.

#### Scenario: La imagen ya está al día

- **WHEN** la última versión `24.x` y el digest de `node:24-alpine` coinciden con los de la imagen `:latest`
- **THEN** no se construye ni se publica ninguna imagen

#### Scenario: Hay una versión nueva de Node

- **WHEN** la última versión `24.x` o el digest de `node:24-alpine` difieren de los de la imagen `:latest`
- **THEN** se reconstruye la última release y se publican `:latest` y `:node<versión>`

#### Scenario: No se puede leer la imagen actual

- **WHEN** la imagen `:latest` no existe o no se pueden leer sus labels de base
- **THEN** la comprobación considera que hay que reconstruir y publicar

#### Scenario: Fallo al consultar nodejs.org

- **WHEN** la consulta a `nodejs.org/dist/index.json` falla o no devuelve ninguna versión `24.x`
- **THEN** el job falla de forma visible y no se publica ninguna imagen

### Requirement: Etiqueta con la versión exacta de Node

Cada imagen publicada por el pipeline SHALL incluir una etiqueta `:node<versión>` que identifique la versión exacta de Node con la que se construyó, y el build SHALL usar esa misma versión mediante el argumento `NODE_VERSION`.

#### Scenario: Release por push a main

- **WHEN** se publica una release por tag `v*` sobre un commit de `main`
- **THEN** la imagen se etiqueta con `:latest`, `:vX.Y.Z`, `:vX.Y` y `:node<versión>`, y `node -v` dentro de la imagen coincide con `<versión>`

#### Scenario: Reconstrucción programada

- **WHEN** la comprobación detecta una versión nueva de Node o de la base
- **THEN** la imagen se etiqueta con `:latest` y `:node<versión>`, sin reescribir `:vX.Y.Z` ni `:vX.Y`

### Requirement: Publicación desde main

Las ejecuciones programadas y manuales SHALL reconstruir el código del tag de la última release publicada, que SHALL estar contenido en `main`; no SHALL construir el HEAD de `main` ni publicar imágenes desde `dev`. La reconstrucción SHALL conservar la versión de la aplicación del tag y solo SHALL actualizar `:latest` y `:node<versión>`.

#### Scenario: Reconstrucción de la última release

- **WHEN** la comprobación detecta una versión de Node o una base nueva
- **THEN** el pipeline construye el commit del último tag `v*` contenido en `main` y republica `:latest` y `:node<versión>` sin cambiar `:vX.Y.Z` ni `:vX.Y`

#### Scenario: Rama por defecto distinta de main

- **WHEN** el workflow programado se ejecuta y la rama por defecto es `dev`
- **THEN** el checkout usa el último tag de release contenido en `main` y la imagen publicada corresponde a ese código

#### Scenario: Push o PR desde dev

- **WHEN** se hace push a `dev` o un PR desde `dev`
- **THEN** no se publica ninguna imagen

#### Scenario: Sin releases

- **WHEN** no existe ningún tag `v*` contenido en `main`
- **THEN** el pipeline no construye ni publica ninguna imagen
