# Spec Delta

## MODIFIED Requirements

### Requirement: Navegación por iconos

La cabecera SHALL navegar con iconos SVG (inicio, feeds, usuario, tema, configuración, acerca de), con etiqueta accesible y estado activo visible, sin controles en texto. El icono de Feeds SHALL situarse en la cabecera, junto al chip del tiempo cuando exista, y SHALL llevar a `/feeds`. El icono de configuración SHALL ser una rueda dentada, claramente distinta del sol del tema claro. En viewport estrecho (móvil) la cabecera SHALL colapsar la navegación en un botón de menú que abre un panel desplegable con los destinos de navegación (gestión, cuenta, acerca de y, sin sesión, entrar) como filas etiquetadas (icono + texto); el conmutador de tema y el acceso a Feeds SHALL seguir visibles fuera del panel.

#### Scenario: Iconos con estado

- **WHEN** se visita una sección
- **THEN** su icono aparece marcado como activo

#### Scenario: Tema por iconos

- **WHEN** se cambia el tema desde su icono
- **THEN** alterna auto/claro/oscuro con sol, luna y símbolo auto, y persiste la elección

#### Scenario: Configuración con rueda dentada

- **WHEN** se mira la cabecera o las pantallas de configuración y gestión
- **THEN** el icono de configuración muestra una rueda dentada y no se confunde con el icono de sol del tema

#### Scenario: Menú en viewport estrecho

- **WHEN** se ve la cabecera en un viewport estrecho de móvil
- **THEN** aparece el botón de menú y los destinos de navegación están en su panel, sin botones amontonados ni solapados en la barra

#### Scenario: Elegir destino en el menú

- **WHEN** se elige un destino del panel
- **THEN** se navega a él y el panel se cierra

#### Scenario: Cerrar el menú

- **WHEN** el panel está abierto y se pulsa `Escape` o fuera de él
- **THEN** el panel se cierra y el foco vuelve al botón de menú

#### Scenario: Icono de Feeds con sesión

- **WHEN** un usuario autenticado tiene al menos una suscripción
- **THEN** la cabecera muestra el icono de Feeds en la zona del tiempo, con etiqueta accesible, y lo marca como activo al visitar `/feeds`

#### Scenario: Sin suscripciones

- **WHEN** un usuario autenticado no tiene ninguna suscripción
- **THEN** la cabecera sigue mostrando el icono de Feeds y al pulsarlo se abre `/feeds`

#### Scenario: Feeds en móvil

- **WHEN** se ve la cabecera en un viewport estrecho de móvil
- **THEN** el icono de Feeds sigue visible en la zona del tiempo, fuera del panel de menú

### Requirement: Secciones de configuración y acerca de

La web SHALL ofrecer `/config` (apertura misma/nueva pestaña, tamaño de enlaces, gestión de feeds con su periodo de actualización y estado del registro) y `/acerca-de` (versión servida por la API, repositorio y detalles), protegidas tras sesión.

#### Scenario: Acerca de con versión

- **WHEN** se visita `/acerca-de`
- **THEN** muestra la versión que sirve la API junto al repositorio y detalles

#### Scenario: Ajustes en configuración

- **WHEN** se visita `/config`
- **THEN** se puede elegir la apertura de enlaces y el tamaño de enlaces, gestionar los feeds y su periodo de actualización, y se informa si el registro está abierto

#### Scenario: Feeds en configuración

- **WHEN** un usuario autenticado entra en `/config`
- **THEN** puede añadir y borrar canales RSS/Atom y elegir cada cuánto se actualizan
