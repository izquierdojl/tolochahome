# Spec Delta

## MODIFIED Requirements

### Requirement: Cambio de grupo en modo barra

En la disposición «Barra», el usuario SHALL poder cambiar de grupo pinchando en su pestaña, arrastrando horizontalmente sobre el contenido en interfaces táctiles y con las flechas del teclado cuando la barra tiene el foco; al entrar en la portada SHALL mostrarse el último grupo visitado por el usuario, o el primero si ya no existe.

#### Scenario: Cambio pinchando en la barra

- **WHEN** se pulsa la pestaña de un grupo
- **THEN** ese grupo pasa a ser el activo y debajo se muestran sus enlaces

#### Scenario: Cambio por arrastre táctil (izquierda-derecha)

- **WHEN** en una interfaz táctil el usuario arrastra sobre el contenido de izquierda a derecha (o al revés) más allá de un umbral
- **THEN** cambia al grupo contiguo en la dirección del arrastre, sin abrir ningún enlace

#### Scenario: Toque normal sobre un enlace

- **WHEN** el usuario toca un enlace sin arrastrar
- **THEN** el enlace se abre según la preferencia de apertura

#### Scenario: Toque tras cambiar de grupo

- **WHEN** el usuario cambia de grupo con un arrastre y después toca un enlace del grupo mostrado
- **THEN** el enlace se abre con un solo toque, según la preferencia de apertura

#### Scenario: Cambio por teclado

- **WHEN** la barra tiene el foco y se pulsan las flechas izquierda o derecha
- **THEN** el foco pasa a la pestaña contigua y ese grupo se muestra como activo

#### Scenario: Grupo activo persistente

- **WHEN** se vuelve a entrar en la portada con el mismo navegador
- **THEN** se muestra el último grupo visitado por el usuario; si ese grupo ya no existe, se muestra el primero

### Requirement: Arrastre visual del contenido del grupo en modo barra

En la disposición «Barra», mientras se arrastra el dedo en horizontal sobre el contenido del grupo activo, el contenido SHALL desplazarse acompañando al gesto; si se suelta sin superar el umbral de cambio, SHALL volver a su posición sin cambiar de grupo ni abrir ningún enlace, y el siguiente toque SHALL abrir el enlace o control tocado según la preferencia de apertura.

#### Scenario: El contenido sigue al dedo

- **WHEN** en una interfaz táctil el usuario arrastra el dedo en horizontal sobre el contenido del grupo activo
- **THEN** el contenido se desplaza en la misma dirección y proporción que el gesto, dando feedback continuo antes de soltar

#### Scenario: Vuelta a su sitio sin cambio

- **WHEN** el usuario suelta el dedo sin superar el umbral de cambio
- **THEN** el contenido vuelve a su posición con una transición breve, no cambia de grupo y no abre ningún enlace

#### Scenario: Toque tras un arrastre corto

- **WHEN** el usuario toca un enlace después de un arrastre que no superó el umbral de cambio
- **THEN** el enlace se abre con un solo toque, según la preferencia de apertura

#### Scenario: Resistencia en los extremos

- **WHEN** el grupo activo es el primero o el último y se arrastra hacia el lado sin grupo contiguo
- **THEN** el contenido ofrece resistencia y no revela ningún grupo fuera de la lista
