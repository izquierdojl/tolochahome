# despliegue Specification

## Purpose

Cómo se construye y publica la imagen de TolochaHome en GHCR, incluidas las reconstrucciones automáticas cuando aparece una versión nueva de Node.

## Requirements

### Requirement: Comprobación periódica de la versión de Node

El pipeline SHALL comprobar cada 6 horas la última versión publicada de la línea `24.x` de Node y compararla con la versión que contiene la imagen `:latest` publicada en GHCR. La comprobación SHALL usar `https://nodejs.org/dist/index.json` como fuente y la versión reportada por `node -v` dentro de la imagen.

#### Scenario: La imagen ya está al día

- **WHEN** la última versión `24.x` coincide con la de la imagen `:latest`
- **THEN** no se construye ni se publica ninguna imagen

#### Scenario: Hay una versión nueva de Node

- **WHEN** la última versión `24.x` es distinta de la de la imagen `:latest`
- **THEN** se reconstruye la imagen y se publican `:latest` y `:node<versión>`

#### Scenario: No se puede leer la imagen actual

- **WHEN** la imagen `:latest` no existe o no se puede ejecutar para leer su versión
- **THEN** la comprobación considera que hay que reconstruir y publicar

#### Scenario: Fallo al consultar nodejs.org

- **WHEN** la consulta a `nodejs.org/dist/index.json` falla o no devuelve ninguna versión `24.x`
- **THEN** el job falla de forma visible y no se publica ninguna imagen

### Requirement: Etiqueta con la versión exacta de Node

Cada imagen publicada por el pipeline SHALL incluir una etiqueta `:node<versión>` que identifique la versión exacta de Node con la que se construyó, y el build SHALL usar esa misma versión mediante el argumento `NODE_VERSION`.

#### Scenario: Release por push a main

- **WHEN** se publica una release por push a `main`
- **THEN** la imagen se etiqueta con `:latest`, `:vX.Y.Z`, `:vX.Y` y `:node<versión>`, y `node -v` dentro de la imagen coincide con `<versión>`

#### Scenario: Reconstrucción programada

- **WHEN** la comprobación detecta una versión nueva de Node
- **THEN** la imagen se etiqueta con `:latest` y `:node<versión>`, sin reescribir `:vX.Y.Z` ni `:vX.Y`

### Requirement: Disparo manual y forzado

El workflow SHALL poder ejecutarse manualmente desde GitHub Actions. La ejecución manual SHALL hacer la misma comprobación y SHALL permitir forzar la republicación aunque la versión de Node ya coincida.

#### Scenario: Ejecución manual sin novedad

- **WHEN** se lanza el workflow a mano sin forzar y la versión de Node ya coincide
- **THEN** no se publica ninguna imagen

#### Scenario: Ejecución manual forzada

- **WHEN** se lanza el workflow a mano con la opción de forzar
- **THEN** se reconstruye y se publican `:latest` y `:node<versión>` aunque la versión coincida

### Requirement: Publicación desde main

Las ejecuciones programadas y manuales SHALL construir el código de `main`, con independencia de cuál sea la rama por defecto del repositorio, y no SHALL publicar imágenes desde `dev`.

#### Scenario: Rama por defecto distinta de main

- **WHEN** el workflow programado se ejecuta y la rama por defecto es `dev`
- **THEN** el checkout usa `main` y la imagen publicada corresponde a ese código

#### Scenario: Push o PR desde dev

- **WHEN** se hace push a `dev` o un PR desde `dev`
- **THEN** no se publica ninguna imagen
