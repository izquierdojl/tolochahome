# Proposal

## Why

En la disposición «Barra», la barra de desplazamiento horizontal nativa compite visualmente con el acento del grupo activo y puede solaparse con él. Conviene ocultar ese indicador para que las pestañas se lean con claridad sin renunciar al acceso a los grupos que no caben en pantalla.

## What Changes

- Ocultar la barra de desplazamiento visible de la barra horizontal de pestañas de grupos en la portada, incluida la pestaña «Frecuentes».
- Mantener el desplazamiento horizontal cuando las pestañas desbordan, la selección por puntero o tacto, la navegación por teclado y el desplazamiento automático de la pestaña activa a la zona visible.
- No cambiar la disposición «Secciones», otras barras de desplazamiento de la aplicación ni el comportamiento de selección y persistencia del grupo activo.

## Capabilities

### New Capabilities

<!-- Ninguna: el ajuste pertenece a la navegación existente de la portada. -->

### Modified Capabilities

- `navegacion`: se modifica el requisito «Barra de grupos con grupo activo» para exigir que la barra de desplazamiento no sea visible sin perder el desplazamiento horizontal ni el acceso a todas las pestañas.

## Impact

- `apps/web/src/components/BarraGrupos.tsx`: ajuste visual del contenedor desplazable de pestañas.
- `openspec/specs/navegacion/spec.md`: se actualizará al archivar el delta del requisito afectado.
- Sin cambios en API, base de datos, configuración persistida ni dependencias.
- Verificación mediante `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` y comprobación manual en temas claro y oscuro, con y sin desbordamiento, en viewport de escritorio y móvil. `apps/web` no dispone de un runner de tests propio.
