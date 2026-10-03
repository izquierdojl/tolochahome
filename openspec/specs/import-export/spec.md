# import-export Specification

## Purpose

Permite traer marcadores desde navegadores (Netscape HTML) o copias propias (JSON) y llevarse todo lo propio en ambos formatos, desde la configuración.

## Requirements

### Requirement: Importar marcadores

El sistema SHALL aceptar un fichero Netscape HTML o JSON propio (tope 5 MB), crear los grupos y favoritos válidos del usuario y devolver resumen (creados, omitidos, errores), validando cada entrada como el alta.

#### Scenario: Importación HTML válida

- **WHEN** se sube un Netscape HTML con carpetas y enlaces válidos
- **THEN** se crean los grupos y favoritos y el resumen cuenta los creados

#### Scenario: Entradas inválidas y duplicadas

- **WHEN** hay URLs malas o favoritas ya existentes (misma URL en el grupo)
- **THEN** se omiten con motivo en el resumen y el resto se importa

#### Scenario: Fichero inválido o enorme

- **WHEN** no es HTML/JSON reconocible o supera 5 MB
- **THEN** responde `400` sin crear nada

#### Scenario: Sin sesión

- **WHEN** se importa sin sesión válida
- **THEN** responde `401`

### Requirement: Exportar marcadores

El sistema SHALL descargar todos los grupos y favoritos propios en Netscape HTML o JSON propio según `?formato=`, como fichero adjunto.

#### Scenario: Exportación por formato

- **WHEN** se pide `?formato=html` o `?formato=json`
- **THEN** descarga el fichero correspondiente con todo lo propio

#### Scenario: Formato desconocido

- **WHEN** se pide otro formato
- **THEN** responde `400`

### Requirement: Gestión en configuración

La web SHALL ofrecer en `/config` importar (selector de fichero con resultado) y exportar (botones html/json que descargan), tras sesión.

#### Scenario: Importar desde la web

- **WHEN** se elige un fichero válido en `/config`
- **THEN** se muestra el resumen y los grupos aparecen sin recargar
