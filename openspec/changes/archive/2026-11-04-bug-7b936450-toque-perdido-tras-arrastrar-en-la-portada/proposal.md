# Proposal

## Why

En móvil, después de cambiar de grupo con un deslizamiento horizontal —o incluso después de un arrastre corto que no llega a cambiar de grupo— el primer toque sobre un enlace del panel se ignora y hay que tocar dos veces. El flag `suprimirClick` se arma en cada arrastre y solo se consume con el siguiente `click`; como el navegador no emite `click` después de un arrastre, el flag queda armado y se come el primer toque real. En escritorio no ocurre porque el camino táctil no se ejecuta.

## What Changes

- Corregir el ciclo de vida de la supresión de click del panel de la portada en la disposición «Barra»: la supresión debe cubrir solo el click sintético del gesto recién terminado y no debe sobrevivir hasta el siguiente toque.
- Mantener la supresión del click del propio arrastre, tanto si cambia de grupo como si no, para no abrir un enlace al soltar el dedo.
- Aclarar en `navegacion` que un arrastre corto no cambia de grupo ni abre ningún enlace, y que el toque posterior abre el enlace o control tocado con un solo toque.
- No cambiar el umbral de arrastre, la animación, la selección de grupo, la disposición «Secciones», la API ni los datos persistidos.

## Capabilities

### New Capabilities

<!-- Ninguna: la corrección pertenece a la navegación existente de la portada. -->

### Modified Capabilities

- `navegacion`: se aclara el comportamiento del toque posterior a un arrastre (corto o con cambio de grupo) y se corrige el contrato para que el primer toque no se descarte.

## Impact

- `apps/web/src/pages/Home.tsx`: ciclo de vida de la supresión de click en el panel del grupo activo.
- `openspec/specs/navegacion/spec.md`: se actualizará al archivar el delta de los requisitos afectados.
- Sin cambios en API, base de datos, configuración persistida ni dependencias.
- Verificación: `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`; comprobación manual en viewport móvil de los casos de la matriz de verificación. `apps/web` no dispone de runner de tests propio.
