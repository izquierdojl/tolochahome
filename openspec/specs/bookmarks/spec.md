# bookmarks Specification

## Purpose

Da a cada usuario su speed dial: mosaicos de favoritos con previsualización dentro de sus grupos, con contador de visitas para ordenar por uso.

## Requirements

### Requirement: Crear favoritos

El sistema SHALL permitir a un usuario autenticado crear favoritos en uno de sus grupos, con título (≤150) y URL http/https (≤2000), asignándoles el siguiente orden libre del grupo.

#### Scenario: Creación válida

- **WHEN** un usuario crea un favorito con título y URL válidos en un grupo propio
- **THEN** el sistema lo guarda y lo devuelve con `201`

#### Scenario: URL o grupo inválidos

- **WHEN** la URL no es http/https, supera 2000 caracteres o el grupo no es propio
- **THEN** el sistema responde `400` (datos) o `404` (grupo ajeno o inexistente)

#### Scenario: Sin sesión

- **WHEN** se crea un favorito sin sesión válida
- **THEN** el sistema responde `401`

### Requirement: Listar favoritos

El sistema SHALL devolver los favoritos propios, filtrables por grupo y ordenados por `orden`, sin mezclar nunca favoritos de otros usuarios.

#### Scenario: Listado por grupo

- **WHEN** un usuario pide los favoritos de un grupo propio
- **THEN** el sistema devuelve solo esos, ordenados

#### Scenario: Listado ajeno

- **WHEN** se piden favoritos de un grupo ajeno o inexistente
- **THEN** el sistema responde `404`

### Requirement: Editar, mover y reordenar favoritos

El sistema SHALL permitir editar título y URL de un favorito propio, moverlo a otro grupo propio (al final de ese grupo) y cambiar su posición con orden contiguo, tanto por arrastre como por botones.

#### Scenario: Edición válida

- **WHEN** un usuario edita título o URL con valores válidos
- **THEN** el sistema actualiza y devuelve el favorito

#### Scenario: Mover de grupo

- **WHEN** un usuario mueve un favorito a otro grupo propio
- **THEN** el sistema lo coloca al final del destino y compacta el origen

#### Scenario: Reordenar por arrastre

- **WHEN** un usuario arrastra un favorito a otra posición de su grupo
- **THEN** la web muestra un indicador visual del destino y, al soltar, el sistema guarda el orden contiguo resultante

#### Scenario: Favorito ajeno

- **WHEN** se opera sobre un favorito de otro usuario
- **THEN** el sistema responde `404`

### Requirement: Borrar favoritos e integridad con grupos

El sistema SHALL permitir borrar un favorito propio, y borrar un grupo SHALL borrar en cascada sus favoritos sin dejar huérfanos.

#### Scenario: Borrado propio

- **WHEN** un usuario borra un favorito suyo
- **THEN** el sistema lo elimina y responde éxito

#### Scenario: Borrado en cascada

- **WHEN** un usuario borra un grupo con favoritos
- **THEN** el sistema elimina el grupo y todos sus favoritos

### Requirement: Contar visitas

El sistema SHALL ofrecer registrar cada apertura de un favorito propio, incrementando su contador para futuros ordenados por uso.

#### Scenario: Visita registrada

- **WHEN** se registra la visita de un favorito propio
- **THEN** el sistema incrementa su contador y responde éxito

### Requirement: Imagen personalizada del favorito

El sistema SHALL permitir elegir por favorito entre favicon automático o una imagen propia subida al servidor (png, jpeg, webp o gif de hasta 1 MB), visible solo para su dueño y eliminada al borrar el favorito.

#### Scenario: Subida válida

- **WHEN** un usuario sube una imagen válida para un favorito propio eligiendo imagen propia
- **THEN** el sistema la guarda privada, la asocia y el mosaico la muestra en lugar del favicon

#### Scenario: Fichero inválido

- **WHEN** se sube un tipo no permitido o más de 1 MB
- **THEN** el sistema responde `400` y no guarda nada

#### Scenario: Acceso ajeno a imagen

- **WHEN** se pide la imagen de un favorito de otro usuario
- **THEN** el sistema responde `404`

### Requirement: Grupos plegables

La web SHALL permitir plegar cada grupo como una persiana, recordando el estado por dispositivo; plegado solo muestra cabecera y conteo.

#### Scenario: Plegar y recordar

- **WHEN** un usuario pliega un grupo y recarga la página
- **THEN** el grupo sigue plegado mostrando cabecera y conteo

### Requirement: Vista previa del contenido

El sistema SHALL ofrecer previsualizar una URL antes de guardarla: extrae el título (og:title o `<title>`) y descarga su og:image al almacén privado (mismos tipos y tope que la subida), rechazando destinos no públicos.

#### Scenario: Previsualización válida

- **WHEN** se previsualiza una URL pública con og:image
- **THEN** el sistema devuelve título e imagen lista para asociar al crear el favorito

#### Scenario: Destino no público o sin imagen

- **WHEN** la URL no es http/https, resuelve a red privada o no ofrece imagen válida
- **THEN** el sistema responde `400` sin guardar nada

### Requirement: Responsive móvil y táctil

La web SHALL ser usable en viewport de 360 px: mosaicos y grupos sin scroll horizontal indeseado, objetivos táctiles de al menos 44 px y DnD operativo con el dedo.

#### Scenario: Móvil 360 px

- **WHEN** se abre la startpage a 360 px de ancho
- **THEN** todo el contenido es alcanzable sin scroll horizontal y los controles responden al tacto

### Requirement: Speed dial con previsualización en la web

La web SHALL mostrar en `/` los grupos con sus mosaicos (favicon del sitio o letra inicial como respaldo), abriendo el destino en la misma o en nueva pestaña a elección, y ofrecer crear, editar, mover y borrar tras autenticación.

#### Scenario: Mosaico con previsualización

- **WHEN** un usuario autenticado ve su startpage
- **THEN** cada favorito muestra su favicon si carga, o su letra inicial si falla, sin bloquear el resto

#### Scenario: Apertura a elección

- **WHEN** un usuario activa un favorito
- **THEN** la web abre el destino según su preferencia (misma o nueva pestaña) y registra la visita

#### Scenario: Sin sesión en la web

- **WHEN** se visita `/` sin sesión válida
- **THEN** la web muestra la bienvenida sin mosaicos ni gestión
