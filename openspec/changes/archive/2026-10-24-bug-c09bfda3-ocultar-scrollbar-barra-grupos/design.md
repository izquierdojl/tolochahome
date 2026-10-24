# Design

## Context

`apps/web/src/components/BarraGrupos.tsx` renderiza el `tablist` como un contenedor `flex` con `overflow-x-auto`. Las pestañas no se encogen y la activa usa un borde inferior de 2 px, que puede coincidir visualmente con la barra de desplazamiento nativa. El componente ya desplaza la pestaña activa a la zona visible con `scrollIntoView` y admite selección por clic, flechas, `Home` y `End`.

La web usa Tailwind CSS 4, que admite propiedades y variantes arbitrarias sin añadir plugins. El contrato observable está en `specs/navegacion/spec.md`; la motivación está en `proposal.md`. `apps/web` no tiene runner de tests propio.

## Goals / Non-Goals

**Goals:**

- Ocultar únicamente la presentación de la barra de desplazamiento del `tablist`, sin alterar su altura ni el acento de la pestaña activa.
- Conservar el desbordamiento y todos los mecanismos actuales de desplazamiento y selección.
- Mantener el ajuste localizado y compatible con los navegadores actuales.

**Non-Goals:**

- No crear una barra de desplazamiento personalizada ni añadir controles de desplazamiento.
- No aplicar estilos globales a otras zonas desplazables.
- No modificar la selección de grupo, los gestos del contenido ni la persistencia.
- No añadir dependencias ni infraestructura de tests para este ajuste.

## Decisions

### 1. Conservar el desplazamiento y ocultar solo su indicador

Se mantiene `overflow-x-auto` en el contenedor y se añaden las utilidades arbitrarias de Tailwind `[scrollbar-width:none]` y `[&::-webkit-scrollbar]:hidden`. La primera usa la propiedad CSS estándar; la segunda cubre navegadores WebKit que requieran el pseudo-elemento.

- **Por qué:** oculta el indicador sin convertir el contenedor en no desplazable y sin reservar espacio adicional.
- **Alternativas descartadas:** `overflow-x-hidden` o eliminar el desbordamiento, porque impediría llegar a pestañas fuera de pantalla; una regla global en `index.css`, porque el ajuste solo pertenece a este componente; un plugin de scrollbars, porque añadiría una dependencia innecesaria.

### 2. Limitar el cambio al contenedor de pestañas

Las clases se aplican directamente al elemento con `role="tablist"` de `BarraGrupos`. No se modifican los botones, sus bordes, los refs, el efecto de `scrollIntoView` ni los manejadores de eventos.

- **Por qué:** el defecto pertenece al contenedor desplazable y una intervención local minimiza regresiones en navegación y presentación.
- **Alternativa descartada:** envolver la barra en otro contenedor o cambiar la estructura de pestañas, ya que no aporta nada para ocultar el indicador.

### 3. Validar el comportamiento visual y la accesibilidad existente

La verificación combinará los comandos de calidad del proyecto con una prueba manual de la portada en disposición «Barra». Se comprobarán listas con y sin desbordamiento, temas claro y oscuro, viewport estrecho y escritorio, selección por puntero o tacto y navegación por flechas, `Home` y `End`, confirmando que la pestaña activa sigue desplazándose a la zona visible.

- **Por qué:** el build no detecta por sí solo una regla CSS ausente o una regresión visual, y no hay tests de web automatizados.
- **Alternativa descartada:** añadir un runner o pruebas de navegador solo para esta corrección; desproporcionado frente al alcance del ajuste.

## Risks / Trade-offs

- **Menor descubribilidad del desbordamiento al ocultar el indicador** → Se conserva el desplazamiento natural y el reposicionamiento automático de la pestaña activa; no se añaden controles nuevos fuera del alcance solicitado.
- **Diferencias de soporte entre motores de navegador** → Se combinan la propiedad estándar y el pseudo-elemento de WebKit, y se revisa el resultado en los navegadores disponibles durante la verificación manual.
- **Una clase arbitraria incorrecta podría compilar sin producir el efecto esperado** → La comprobación manual debe verificar expresamente que no aparece la scrollbar y que la barra desbordada sigue siendo desplazable.

## Migration Plan

No hay migración de datos, configuración ni API. El ajuste se despliega con el build habitual de la web y puede revertirse revirtiendo el commit de implementación.
