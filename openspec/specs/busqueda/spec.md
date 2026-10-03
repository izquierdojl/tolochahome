# busqueda Specification

## Purpose

Permite buscar directamente desde la portada con motores configurables por usuario, con atajos por alias y sugerencias de autocompletado cuando el motor las ofrece.

## Requirements

### Requirement: Motores iniciales

El sistema SHALL crear para cada usuario los motores Google (alias `g`), Wikipedia (`w`) y DuckDuckGo (`d`), con Google por defecto, sin duplicarlos si ya existen.

#### Scenario: Alta con motores iniciales

- **WHEN** una cuenta nueva entra por primera vez (o una existente sin motores)
- **THEN** dispone de `g`, `w` y `d` con Google por defecto

### Requirement: Gestionar motores

El sistema SHALL permitir a un usuario autenticado crear, listar, editar, borrar y reordenar sus motores (`nombre`, `url_template` con `{q}`, `alias` único por usuario, `sugerencias_url` opcional) y marcar uno por defecto.

#### Scenario: CRUD propio

- **WHEN** un usuario opera sus motores con datos válidos
- **THEN** el sistema persiste y devuelve el cambio (`201` al crear)

#### Scenario: Motor ajeno

- **WHEN** se opera sobre un motor de otro usuario
- **THEN** el sistema responde `404`

#### Scenario: Plantilla o alias inválidos

- **WHEN** la plantilla no contiene `{q}`, no es http/https o el alias está en uso o vacío
- **THEN** el sistema responde `400` en español

### Requirement: Buscar con atajos

La web SHALL ofrecer barra central con motor seleccionable y atajos por alias al inicio del texto (`g …`, `w …`, `d …` o personalizados); `Enter` abre la URL resultante según la preferencia de apertura.

#### Scenario: Búsqueda directa

- **WHEN** se escribe texto y se pulsa `Enter`
- **THEN** se abre la plantilla del motor activo con el texto codificado

#### Scenario: Atajo por alias

- **WHEN** el texto empieza por un alias conocido más espacio
- **THEN** se usa ese motor para esa búsqueda sin cambiar el activo

### Requirement: Sugerencias de autocompletado

El sistema SHALL ofrecer sugerencias del motor activo al escribir (vía proxy propio que normaliza a lista de textos), con degradación silenciosa si el motor no trae o falla; la web las muestra seleccionables sin bloquear la escritura.

#### Scenario: Sugerencias disponibles

- **WHEN** se escribe con un motor con sugerencias
- **THEN** aparecen opciones que al elegirse completan y buscan

#### Scenario: Sin sugerencias

- **WHEN** el motor no trae URL de sugerencias o el proxy falla
- **THEN** no se muestra nada y la búsqueda manual sigue funcionando
