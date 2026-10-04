# groups Specification

## Purpose

Permite a cada usuario organizar sus favoritos en grupos ordenados, que son las secciones del speed dial de su startpage.

## Requirements

### Requirement: Crear grupos

El sistema SHALL permitir a un usuario autenticado crear grupos con nombre, asignándoles el siguiente orden libre, y los nombres SHALL limitarse a 100 caracteres.

#### Scenario: Creación válida

- **WHEN** un usuario autenticado crea un grupo con un nombre válido
- **THEN** el sistema lo guarda asociado a ese usuario y lo devuelve con `201`

#### Scenario: Nombre inválido

- **WHEN** se crea un grupo sin nombre o con más de 100 caracteres
- **THEN** el sistema responde `400` con mensaje en español

#### Scenario: Sin sesión

- **WHEN** se intenta crear un grupo sin sesión válida
- **THEN** el sistema responde `401` con el formato de error `{ error: { codigo, mensaje } }`

### Requirement: Listar grupos

El sistema SHALL devolver solo los grupos del usuario autenticado, ordenados por `orden`, incluyendo el conteo de favoritos de cada grupo (cero hasta el change de bookmarks).

#### Scenario: Listado ordenado y aislado

- **WHEN** un usuario autenticado pide sus grupos
- **THEN** el sistema devuelve únicamente los suyos ordenados, cada uno con su conteo

### Requirement: Renombrar y reordenar grupos

El sistema SHALL permitir renombrar un grupo propio y cambiar su posición, reasignando el orden de los grupos afectados sin huecos ni duplicados; en la web el reordenado es solo por arrastre (ratón y táctil), sin botones de subir/bajar.

#### Scenario: Renombrar grupo propio

- **WHEN** un usuario renombra uno de sus grupos con un nombre válido
- **THEN** el sistema actualiza el nombre y devuelve el grupo

#### Scenario: Reordenar grupo

- **WHEN** un usuario mueve un grupo a otra posición
- **THEN** el sistema reordena sus grupos de forma contigua y devuelve la lista ordenada

#### Scenario: Reordenar grupos por arrastre

- **WHEN** un usuario arrastra un grupo a otra posición
- **THEN** la web muestra un indicador visual del destino y, al soltar, el sistema guarda el orden contiguo resultante

#### Scenario: Sin botones de orden

- **WHEN** se ve un grupo en `/gestion`
- **THEN** no hay botones de subir ni bajar; el grupo se reordena arrastrándolo desde su asa

#### Scenario: Grupo ajeno o inexistente

- **WHEN** se opera sobre un grupo que no existe o es de otro usuario
- **THEN** el sistema responde `404` sin revelar a quién pertenece

### Requirement: Color de grupo

Cada grupo SHALL poder tener un color hexadecimal propio (`#rrggbb`), visible como acento en su sección y editable junto al nombre; sin color usa el acento por defecto del tema.

#### Scenario: Asignar color

- **WHEN** se crea o renombra un grupo indicando un color válido
- **THEN** el sistema lo guarda y lo devuelve en el grupo

#### Scenario: Color inválido

- **WHEN** se indica un color que no es `#rrggbb`
- **THEN** el sistema responde `400`

### Requirement: Borrar grupos

El sistema SHALL permitir borrar un grupo propio. Sin bookmarks (change posterior), el borrado es directo; con bookmarks se definirá si se exige vaciarlo o se borra en cascada.

#### Scenario: Borrado propio

- **WHEN** un usuario borra uno de sus grupos
- **THEN** el sistema lo elimina y responde éxito

#### Scenario: Borrado ajeno

- **WHEN** se intenta borrar un grupo de otro usuario
- **THEN** el sistema responde `404`

### Requirement: Gestión de grupos en la web

La web SHALL ofrecer crear, renombrar, borrar y reordenar grupos tras `RequireAuth`, y mostrar los grupos en la startpage (`/`) como secciones (vacías hasta el change de bookmarks).

#### Scenario: Crear desde la web

- **WHEN** un usuario autenticado crea un grupo en la web
- **THEN** aparece en su startpage sin recargar la página

#### Scenario: Sin sesión en la web

- **WHEN** se visita `/` sin sesión válida
- **THEN** la web muestra la bienvenida con enlaces a `/login` y no ofrece gestión de grupos (solo existe tras autenticarse)
