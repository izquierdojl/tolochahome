# Spec Delta

## MODIFIED Requirements

### Requirement: Speed dial como portada limpia

La página `/` para usuarios autenticados SHALL mostrar grupos con mosaicos o filas y persianas para ver y abrir, sin controles de edición ni borrado sobre los grupos o enlaces y sin formularios desplegados por defecto; la gestión completa vive en `/gestion`, salvo el acceso de alta rápida de enlace bajo demanda en los controles superiores.

#### Scenario: Portada limpia

- **WHEN** un usuario autenticado entra en `/`
- **THEN** ve sus grupos y mosaicos sin formularios abiertos ni controles de edición o borrado sobre los grupos o enlaces

#### Scenario: Selección y apertura

- **WHEN** elige un grupo o activa un mosaico
- **THEN** filtra o abre el destino según su preferencia, sin salir de la portada

## ADDED Requirements

### Requirement: Alta rápida de enlace en la portada

En `/`, cuando el usuario autenticado tenga al menos un grupo, la barra superior de controles SHALL ofrecer un botón para desplegar un formulario de alta rápida que pida solo la URL (anteponiendo `https://` si no incluye esquema) y el grupo destino en un desplegable; al guardar SHALL obtener título e imagen por vista previa (o usar el dominio y el favicon como respaldo), crear el favorito y actualizar la portada.

#### Scenario: Abrir y cerrar el formulario rápido

- **WHEN** un usuario autenticado con grupos pulsa el botón de añadir enlace rápido en `/`
- **THEN** se despliega el formulario con el campo de URL y el desplegable de grupo, y al cancelar o pulsar `Escape` se cierra sin guardar

#### Scenario: Sin grupos creados

- **WHEN** un usuario autenticado aún no tiene ningún grupo
- **THEN** no se muestra el botón de alta rápida en la portada

#### Scenario: Grupo preseleccionado

- **WHEN** se abre el formulario de alta rápida
- **THEN** el desplegable preselecciona el grupo activo si se está en disposición «Barra» sobre un grupo real, o el primer grupo del usuario en caso contrario

#### Scenario: Guardar URL sin esquema con vista previa disponible

- **WHEN** el usuario introduce una dirección sin `https://` (por ejemplo `ejemplo.com`), elige un grupo y guarda, y la previsualización devuelve título e imagen
- **THEN** el sistema normaliza la URL con `https://`, crea el favorito en ese grupo con el título y la imagen obtenidos, cierra el formulario y muestra el nuevo enlace en la portada actualizando el contador del grupo

#### Scenario: Guardar cuando la vista previa falla o no ofrece título

- **WHEN** el usuario guarda una URL válida pero la previsualización falla o no devuelve título
- **THEN** el sistema crea igualmente el favorito usando el dominio de la URL como título y el favicon por defecto

#### Scenario: URL inválida

- **WHEN** el usuario intenta guardar una URL no válida (por ejemplo con esquema distinto de `http`/`https` o formato mal formado)
- **THEN** el formulario muestra un mensaje de error en español y no cierra ni guarda el enlace
