# navegacion Specification

## Purpose

Hace del speed dial una portada limpia y lleva la gestión y los ajustes a secciones propias con iconos, mostrando la versión de la app.

## Requirements

### Requirement: Speed dial como portada limpia

La página `/` para usuarios autenticados SHALL mostrar solo grupos con mosaicos y persianas para ver y abrir, sin ningún control de gestión a la vista; toda la gestión vive en `/gestion`.

#### Scenario: Portada limpia

- **WHEN** un usuario autenticado entra en `/`
- **THEN** ve sus grupos y mosaicos sin formularios ni controles de gestión a la vista

#### Scenario: Selección y apertura

- **WHEN** elige un grupo o activa un mosaico
- **THEN** filtra o abre el destino según su preferencia, sin salir de la portada

### Requirement: Pantalla de gestión

La web SHALL ofrecer `/gestion` tras `RequireAuth` con la gestión completa (grupos: crear, renombrar, color, borrar, ordenar; favoritos: crear, editar, imagen, mover, borrar, ordenar); sin sesión redirige a `/login`.

#### Scenario: Gestión completa

- **WHEN** un usuario autenticado entra en `/gestion`
- **THEN** puede operar grupos y favoritos con las mismas acciones que hoy ofrece `/`

#### Scenario: Gestión sin sesión

- **WHEN** se visita `/gestion` sin sesión válida
- **THEN** la web redirige a `/login`

### Requirement: Navegación por iconos

La cabecera SHALL navegar con iconos SVG (inicio, usuario, tema, configuración, acerca de), con etiqueta accesible y estado activo visible, sin controles en texto. El icono de configuración SHALL ser una rueda dentada, claramente distinta del sol del tema claro. En viewport estrecho (móvil) la cabecera SHALL colapsar la navegación en un botón de menú que abre un panel desplegable con los mismos destinos como filas etiquetadas (icono + texto); el conmutador de tema SHALL seguir visible fuera del panel.

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
- **THEN** aparece el botón de menú y los destinos están en su panel, sin botones amontonados ni solapados en la barra

#### Scenario: Elegir destino en el menú

- **WHEN** se elige un destino del panel
- **THEN** se navega a él y el panel se cierra

#### Scenario: Cerrar el menú

- **WHEN** el panel está abierto y se pulsa `Escape` o fuera de él
- **THEN** el panel se cierra y el foco vuelve al botón de menú

### Requirement: Secciones de configuración y acerca de

La web SHALL ofrecer `/config` (apertura misma/nueva pestaña, tamaño de enlaces, estado del registro) y `/acerca-de` (versión servida por la API, repositorio y detalles), protegidas tras sesión.

#### Scenario: Acerca de con versión

- **WHEN** se visita `/acerca-de`
- **THEN** muestra la versión que sirve la API junto al repositorio y detalles

#### Scenario: Ajustes en configuración

- **WHEN** se visita `/config`
- **THEN** se puede elegir la apertura de enlaces y el tamaño de enlaces, y se informa si el registro está abierto

### Requirement: Tamaño de enlaces

La web SHALL ofrecer en `/config` el ajuste «Tamaño de enlaces» con cinco niveles (muy pequeño, pequeño, mediano, grande, muy grande), con mediano por defecto; la elección SHALL aplicarse a los mosaicos del speed dial en `/` y persistir entre sesiones del mismo navegador.

#### Scenario: Cambiar tamaño

- **WHEN** se elige un nivel de tamaño en `/config`
- **THEN** los mosaicos se muestran a ese tamaño sin recargar la página

#### Scenario: Tamaño persistente

- **WHEN** se recarga la app o se vuelve a entrar con el mismo navegador
- **THEN** los mosaicos mantienen el último tamaño elegido (mediano si nunca se eligió)

### Requirement: Versión en salud

El endpoint `GET /api/v1/health` SHALL incluir la versión de la app (`version`) y si el registro está abierto (`registroAbierto`), además de `ok` y `servicio`.

#### Scenario: Salud con versión

- **WHEN** se pide `/api/v1/health`
- **THEN** responde `200` con `{ ok: true, servicio, version, registroAbierto }`

### Requirement: Presentación de enlaces carpetas o listas

La web SHALL ofrecer en `/config` el ajuste «Presentación de enlaces» con dos modos, «Carpetas» y «Listas», con carpetas por defecto; la elección SHALL aplicarse a la portada `/` y persistir entre sesiones del mismo navegador. En modo carpetas la portada se ve como hoy (secciones plegables con mosaicos); en modo listas cada grupo aparece como cabecera y sus favoritos como filas compactas (título y dominio) que abren según la preferencia de apertura.

#### Scenario: Cambiar a listas

- **WHEN** se elige «Listas» en `/config`
- **THEN** la portada muestra cada grupo como cabecera con sus favoritos en filas compactas, sin persianas ni mosaicos, y se abre cada enlace según la preferencia de apertura

#### Scenario: Volver a carpetas

- **WHEN** se elige «Carpetas» en `/config`
- **THEN** la portada vuelve a las secciones plegables con mosaicos como antes del cambio

#### Scenario: Modo persistente

- **WHEN** se recarga la app o se vuelve a entrar con el mismo navegador
- **THEN** la portada mantiene el último modo elegido (carpetas si nunca se eligió)

### Requirement: Plegado y desplegado globales en la portada

La portada `/` SHALL ofrecer un control de plegado global que plega o despliega de una vez todas las secciones de grupos, coherente con el plegado individual por grupo que se guarda por usuario; en modo listas el control no se muestra.

#### Scenario: Plegar todo

- **WHEN** se activa el control con secciones desplegadas
- **THEN** todas las secciones quedan plegadas de golpe

#### Scenario: Desplegar todo

- **WHEN** se activa el control con secciones plegadas
- **THEN** todas las secciones quedan desplegadas de golpe

#### Scenario: Estado global persistente

- **WHEN** se recarga la portada tras plegar o desplegar todo
- **THEN** cada sección mantiene el estado resultante de la acción global

#### Scenario: Sin control en modo listas

- **WHEN** se ve la portada en modo listas
- **THEN** no aparece el control de plegado global
