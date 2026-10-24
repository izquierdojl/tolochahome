# navegacion Specification

## Purpose

Hace del speed dial una portada limpia y lleva la gestión y los ajustes a secciones propias con iconos, mostrando la versión de la app.

## Requirements

### Requirement: Speed dial como portada limpia

La página `/` para usuarios autenticados SHALL mostrar grupos con mosaicos o filas y persianas para ver y abrir, sin controles de edición ni borrado sobre los grupos o enlaces y sin formularios desplegados por defecto; la gestión completa vive en `/gestion`, salvo el acceso de alta rápida de enlace bajo demanda en los controles superiores.

#### Scenario: Portada limpia

- **WHEN** un usuario autenticado entra en `/`
- **THEN** ve sus grupos y mosaicos sin formularios abiertos ni controles de edición o borrado sobre los grupos o enlaces

#### Scenario: Selección y apertura

- **WHEN** elige un grupo o activa un mosaico
- **THEN** filtra o abre el destino según su preferencia, sin salir de la portada

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

La web SHALL ofrecer en `/config` el ajuste «Tamaño de enlaces» con seis niveles (diminuto, muy pequeño, pequeño, mediano, grande, muy grande), siendo «diminuto» el más pequeño de todos y «mediano» el valor por defecto; la elección SHALL aplicarse a los mosaicos del speed dial en `/` y persistir entre sesiones del mismo navegador.

#### Scenario: Cambiar tamaño

- **WHEN** se elige un nivel de tamaño en `/config`
- **THEN** los mosaicos se muestran a ese tamaño sin recargar la página

#### Scenario: Tamaño persistente

- **WHEN** se recarga la app o se vuelve a entrar con el mismo navegador
- **THEN** los mosaicos mantienen el último tamaño elegido (mediano si nunca se eligió)

#### Scenario: Nivel diminuto

- **WHEN** se elige «Diminuto» en `/config`
- **THEN** los mosaicos se muestran más pequeños que en «Muy pequeño», caben más por fila en pantallas de móvil estrechas sin scroll horizontal, y los objetivos táctiles siguen midiendo al menos 44 px

### Requirement: Versión en salud

El endpoint `GET /api/v1/health` SHALL incluir la versión de la app (`version`) y si el registro está abierto (`registroAbierto`), además de `ok` y `servicio`.

#### Scenario: Salud con versión

- **WHEN** se pide `/api/v1/health`
- **THEN** responde `200` con `{ ok: true, servicio, version, registroAbierto }`

### Requirement: Presentación de enlaces carpetas o listas

La web SHALL ofrecer en `/config` el ajuste «Presentación de enlaces» con dos modos, «Carpetas» y «Listas», con carpetas por defecto; la elección SHALL aplicarse a la portada `/` y persistir entre sesiones del mismo navegador. En modo carpetas la portada se ve como hoy (secciones plegables con mosaicos); en modo listas cada grupo aparece como cabecera plegable, igual que en carpetas, y sus favoritos como filas compactas con imagen o favicon, título y dominio, que abren según la preferencia de apertura.

#### Scenario: Cambiar a listas

- **WHEN** se elige «Listas» en `/config`
- **THEN** la portada muestra cada grupo como cabecera plegable con sus favoritos en filas compactas con imagen o favicon, título y dominio, sin mosaicos, y se abre cada enlace según la preferencia de apertura

#### Scenario: Plegar un grupo en listas

- **WHEN** un usuario pliega un grupo desde su cabecera en modo listas
- **THEN** el grupo se contrae mostrando solo su cabecera; al recargar la portada sigue plegado

#### Scenario: Plegado coherente entre modos

- **WHEN** un usuario pliega un grupo en modo listas y cambia a modo carpetas, o al revés
- **THEN** el grupo aparece plegado en el modo de destino porque el estado de plegado es el mismo por usuario y grupo

#### Scenario: Imagen en las filas de la lista

- **WHEN** una fila de favorito se muestra en modo listas
- **THEN** muestra la imagen propia del favorito si existe, o el favicon del sitio si no, o la letra inicial como respaldo cuando el favicon no carga, sin bloquear el resto de filas

#### Scenario: Volver a carpetas

- **WHEN** se elige «Carpetas» en `/config`
- **THEN** la portada vuelve a las secciones plegables con mosaicos como antes del cambio

#### Scenario: Modo persistente

- **WHEN** se recarga la app o se vuelve a entrar con el mismo navegador
- **THEN** la portada mantiene el último modo elegido (carpetas si nunca se eligió)

### Requirement: Disposición de grupos en la portada

La web SHALL ofrecer en `/config` el ajuste «Disposición de grupos» con dos valores, «Secciones» y «Barra», con secciones por defecto; la elección SHALL aplicarse a la portada `/`, persistir entre sesiones del mismo navegador y ser independiente de «Presentación de enlaces».

#### Scenario: Cambiar a barra

- **WHEN** se elige «Barra» en `/config`
- **THEN** la portada muestra la barra de grupos con un solo grupo activo, sin recargar la página

#### Scenario: Volver a secciones

- **WHEN** se elige «Secciones» en `/config`
- **THEN** la portada vuelve a mostrar los grupos como secciones apiladas con su plegado

#### Scenario: Disposición persistente

- **WHEN** se recarga la app o se vuelve a entrar con el mismo navegador
- **THEN** la portada mantiene la última disposición elegida (secciones si nunca se eligió)

#### Scenario: Combinable con la presentación

- **WHEN** se está en disposición «Barra» y se cambia «Presentación de enlaces»
- **THEN** los enlaces del grupo activo se muestran como mosaicos o filas según lo elegido

### Requirement: Barra de grupos con grupo activo

En la disposición «Barra», la portada SHALL mostrar bajo el buscador una barra horizontal con una pestaña por grupo, con el nombre y el color del grupo como acento de la pestaña activa y desplazamiento horizontal sin una barra de desplazamiento visible cuando no caben, y debajo solo los enlaces del grupo activo con su nombre, su contador y el control «abrir todos»; no SHALL mostrarse controles de plegado.

#### Scenario: Un solo grupo a la vista

- **WHEN** se elige un grupo en la barra
- **THEN** debajo se muestran solo los enlaces de ese grupo, sin las secciones de los demás grupos

#### Scenario: Pestaña con color de grupo

- **WHEN** el grupo activo tiene color asignado
- **THEN** su pestaña muestra ese color como acento en la barra

#### Scenario: Barra desbordada

- **WHEN** hay más grupos de los que caben en la barra
- **THEN** se puede desplazar la barra en horizontal para ver y elegir todos

#### Scenario: Barra de desplazamiento oculta

- **WHEN** se muestra la barra de grupos, tanto si las pestañas caben como si desbordan
- **THEN** no se muestra una barra de desplazamiento horizontal visible y el acento de la pestaña activa queda libre de solapamientos

#### Scenario: Sin controles de plegado

- **WHEN** se ve la portada en disposición «Barra»
- **THEN** no aparecen ni el plegado por grupo ni el control de plegado global

#### Scenario: Grupo activo sin favoritos

- **WHEN** el grupo activo no tiene favoritos
- **THEN** se muestra el aviso de grupo vacío, como en la disposición de secciones

### Requirement: Cambio de grupo en modo barra

En la disposición «Barra», el usuario SHALL poder cambiar de grupo pinchando en su pestaña, arrastrando horizontalmente sobre el contenido en interfaces táctiles y con las flechas del teclado cuando la barra tiene el foco; al entrar en la portada SHALL mostrarse el último grupo visitado por el usuario, o el primero si ya no existe.

#### Scenario: Cambio pinchando en la barra

- **WHEN** se pulsa la pestaña de un grupo
- **THEN** ese grupo pasa a ser el activo y debajo se muestran sus enlaces

#### Scenario: Cambio por arrastre táctil (izquierda-derecha)

- **WHEN** en una interfaz táctil el usuario arrastra sobre el contenido de izquierda a derecha (o al revés) más allá de un umbral
- **THEN** cambia al grupo contiguo en la dirección del arrastre, sin abrir ningún enlace

#### Scenario: Toque normal sobre un enlace

- **WHEN** el gesto no supera el umbral de arrastre
- **THEN** se trata como toque y el enlace se abre según la preferencia de apertura

#### Scenario: Cambio por teclado

- **WHEN** la barra tiene el foco y se pulsan las flechas izquierda o derecha
- **THEN** el foco pasa a la pestaña contigua y ese grupo se muestra como activo

#### Scenario: Grupo activo persistente

- **WHEN** se vuelve a entrar en la portada con el mismo navegador
- **THEN** se muestra el último grupo visitado por el usuario; si ese grupo ya no existe, se muestra el primero

### Requirement: Plegado y desplegado globales en la portada

La portada `/` SHALL ofrecer un control de plegado global que plega o despliega de una vez todas las secciones de grupos, coherente con el plegado individual por grupo que se guarda por usuario; en modo listas y en la disposición «Barra» el control no se muestra.

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

#### Scenario: Sin control en modo barra

- **WHEN** se ve la portada en disposición «Barra»
- **THEN** no aparece el control de plegado global

### Requirement: Arrastre visual del contenido del grupo en modo barra

En la disposición «Barra», mientras se arrastra el dedo en horizontal sobre el contenido del grupo activo, el contenido SHALL desplazarse acompañando al gesto; si se suelta sin superar el umbral de cambio, SHALL volver a su posición y el gesto SHALL tratarse como un toque normal.

#### Scenario: El contenido sigue al dedo

- **WHEN** en una interfaz táctil el usuario arrastra el dedo en horizontal sobre el contenido del grupo activo
- **THEN** el contenido se desplaza en la misma dirección y proporción que el gesto, dando feedback continuo antes de soltar

#### Scenario: Vuelta a su sitio sin cambio

- **WHEN** el usuario suelta el dedo sin superar el umbral de cambio
- **THEN** el contenido vuelve a su posición con una transición breve, no cambia de grupo y el gesto se trata como toque normal

#### Scenario: Resistencia en los extremos

- **WHEN** el grupo activo es el primero o el último y se arrastra hacia el lado sin grupo contiguo
- **THEN** el contenido ofrece resistencia y no revela ningún grupo fuera de la lista

### Requirement: Transición al cambiar de grupo en modo barra

En la disposición «Barra», todo cambio de grupo (por arrastre superando el umbral o al pulsar una pestaña) SHALL mostrarse con una transición de deslizamiento en la dirección del grupo destino, en lugar de un cambio instantáneo; con `prefers-reduced-motion` activo el cambio SHALL ser inmediato o con una transición mínima, sin seguimiento del dedo.

#### Scenario: Transición al soltar el arrastre

- **WHEN** el usuario suelta el dedo habiendo superado el umbral de arrastre
- **THEN** el contenido completa el deslizamiento hacia el grupo contiguo con una transición suave y se muestra el grupo destino

#### Scenario: Transición al pulsar una pestaña

- **WHEN** el usuario pulsa la pestaña de otro grupo en la barra
- **THEN** el contenido cambia al grupo elegido con la misma transición de deslizamiento, en la dirección del orden de los grupos

#### Scenario: Movimiento reducido

- **WHEN** el sistema tiene activada la preferencia de movimiento reducido
- **THEN** el cambio de grupo no muestra seguimiento del dedo ni animación de deslizamiento, sino un cambio inmediato o con transición mínima

### Requirement: Sección Frecuentes en la portada

La portada `/` SHALL mostrar siempre, como primera sección (y primera pestaña en la disposición «Barra»), una sección «Frecuentes» con los enlaces más abiertos del usuario, en solo lectura y respetando el modo de presentación («Carpetas» en mosaicos, «Listas» en filas); SHALL ser plegable como cualquier sección y, sin clics, SHALL mostrar su estado vacío.

#### Scenario: Primera sección

- **WHEN** un usuario autenticado entra en la portada en disposición de secciones
- **THEN** «Frecuentes» aparece la primera, antes de sus grupos

#### Scenario: Primera pestaña en barra

- **WHEN** la portada está en disposición «Barra»
- **THEN** «Frecuentes» es la primera pestaña y, al seleccionarla, se muestran sus enlaces

#### Scenario: Modo de presentación

- **WHEN** el modo de presentación es «Carpetas»
- **THEN** «Frecuentes» usa mosaicos, y con «Listas» usa filas, igual que un grupo

#### Scenario: Plegable

- **WHEN** el usuario pliega «Frecuentes» y recarga la portada
- **THEN** sigue plegada mostrando su cabecera y conteo

#### Scenario: Solo lectura

- **WHEN** se ve la sección «Frecuentes»
- **THEN** no ofrece editar, mover, borrar ni «Abrir todos» los enlaces; solo abrirlos, registrando la visita

#### Scenario: Estado vacío

- **WHEN** el usuario todavía no ha abierto ningún enlace
- **THEN** «Frecuentes» muestra su estado vacío como sección, sin enlaces
