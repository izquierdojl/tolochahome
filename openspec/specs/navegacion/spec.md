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

La cabecera SHALL navegar con iconos SVG (inicio, usuario, tema, configuración, acerca de), con etiqueta accesible y estado activo visible, sin controles en texto.

#### Scenario: Iconos con estado

- **WHEN** se visita una sección
- **THEN** su icono aparece marcado como activo

#### Scenario: Tema por iconos

- **WHEN** se cambia el tema desde su icono
- **THEN** alterna auto/claro/oscuro con sol, luna y símbolo auto, y persiste la elección

### Requirement: Secciones de configuración y acerca de

La web SHALL ofrecer `/config` (apertura misma/nueva pestaña, estado del registro) y `/acerca-de` (versión servida por la API, repositorio y detalles), protegidas tras sesión.

#### Scenario: Acerca de con versión

- **WHEN** se visita `/acerca-de`
- **THEN** muestra la versión que sirve la API junto al repositorio y detalles

### Requirement: Versión en salud

El endpoint `GET /api/v1/health` SHALL incluir la versión de la app (`version`) y si el registro está abierto (`registroAbierto`), además de `ok` y `servicio`.

#### Scenario: Salud con versión

- **WHEN** se pide `/api/v1/health`
- **THEN** responde `200` con `{ ok: true, servicio, version, registroAbierto }`
