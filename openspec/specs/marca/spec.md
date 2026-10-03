# marca Specification

## Purpose

Da a TolochaHome una marca propia y visible: logotipo montaña + sol + casita en pine/ocre que aparece en la pestaña, la cabecera y los iconos del sistema.

## Requirements

### Requirement: Logotipo y favicon

La web SHALL servirse con favicon SVG propio, `apple-touch-icon` y `theme-color`, y mostrar la marca centrada en la cabecera junto al nombre, legible en claro y oscuro.

#### Scenario: Pestaña con marca

- **WHEN** se abre la app en una pestaña
- **THEN** se ve el favicon propio y el título TolochaHome

#### Scenario: Cabecera con marca

- **WHEN** se ve cualquier página
- **THEN** la cabecera muestra el logotipo junto al nombre
