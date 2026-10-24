# Spec Delta

## MODIFIED Requirements

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
