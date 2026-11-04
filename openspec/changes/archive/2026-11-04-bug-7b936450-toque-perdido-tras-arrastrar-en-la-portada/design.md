# Design

## Context

See `proposal.md` — Why. El gesto vive en `apps/web/src/pages/Home.tsx` (disposición «Barra»): `onTouchStart/Move/End/Cancel` sobre el panel del grupo activo, con `touch-action: pan-y` y una animación de salida/entrada de 200 ms por fase.

La supresión de click es un booleano `suprimirClick` que se arma en `toqueFin` por dos caminos: cuando el arrastre supera el umbral y cambia de grupo, y cuando hubo cualquier arrastre aunque no cambiara de grupo. Se desarma únicamente dentro de `capturarClick`, al consumir el siguiente `click`. El navegador no emite `click` después de un arrastre, así que el flag sobrevive hasta el primer toque real y lo descarta.

`apps/web` no tiene runner de tests propio; la verificación es `typecheck`, `lint`, `build` y prueba manual en viewport móvil.

## Goals / Non-Goals

**Goals:**

- Que la supresión cubra solo el click sintético del gesto recién terminado.
- Que el primer toque posterior a un arrastre —corto o con cambio de grupo— se procese siempre.
- Mantener la protección frente a aperturas accidentales al soltar un arrastre.
- Conservar el gesto táctil, el umbral, la animación y la persistencia del grupo activo.

**Non-Goals:**

- Rehacer el gesto con Pointer Events.
- Cambiar el umbral de 50 px ni el de inicio de arrastre de 8 px.
- Añadir un runner de tests de UI o una dependencia nueva.
- Tocar la API, la base de datos o la disposición «Secciones».

## Decisions

### 1. Sustituir el booleano por una marca temporal con limpieza al siguiente gesto

La supresión se representa como un instante límite (`performance.now() + SUPRESION_CLICK_MS`, con una ventana de 300 ms) en un `useRef`. `capturarClick` suprime solo mientras `performance.now()` sea anterior a ese límite. Además, al iniciar un gesto táctil válido (un solo toque y fase en reposo) la marca se limpia.

- **Por qué:** la marca caduca sola aunque el navegador no emita el click esperado, y el reinicio en el siguiente `touchstart` garantiza que un reintento rápido tras un arrastre corto no se pierda. La ventana de 300 ms queda por debajo de los 400 ms de la transición completa y cubre el click sintético, que llega inmediatamente después de `touchend`.
- **Alternativas descartadas:** solo caducidad por tiempo, porque un reintento rápido dentro de la ventana seguiría perdiéndose; solo reinicio en el siguiente toque, porque en un portátil táctil el primer click de ratón podría quedar descartado; limpiar al terminar la animación, porque no cubre el rebote ni el camino de movimiento reducido; eliminar la supresión, porque confía en que ningún navegador sintetice un click tras un arrastre y pierde la red de seguridad del requisito «sin abrir ningún enlace».

### 2. Mantener la supresión del click del propio arrastre, también en el corto

El click del gesto se sigue neutralizando cuando hubo arrastre, aunque no se supere el umbral de cambio de grupo. Un arrastre horizontal no es un toque: la intención no es abrir el enlace que haya debajo. Lo que cambia es que la supresión ya no alcanza al toque siguiente.

- **Por qué:** evita aperturas accidentales si el navegador considera el movimiento un tap (por ejemplo, cerca del límite de 8 px) y mantiene el contrato de que un arrastre no abre enlaces.
- **Alternativa descartada:** suprimir solo cuando se cambia de grupo, que dejaría pasar un click sintético en arrastres cortos y haría que el gesto abriera un enlace sin querer.

### 3. Seguir con eventos táctiles nativos

No se migra a Pointer Events ni se añade una librería de gestos. El defecto está en el ciclo de vida del guard de click, no en la detección del gesto.

- **Por qué:** el cambio es localizado y conserva el comportamiento ya probado de `touch-action: pan-y`, el scroll vertical nativo y la animación existente.
- **Alternativa descartada:** Pointer Events, que unificaría ratón y tacto pero obliga a revisar de nuevo el scroll, la captura de puntero y los navegadores móviles para un bug que no lo requiere.

## Risks / Trade-offs

- **Un click sintético retrasado más de 300 ms podría colarse** → los navegadores actuales lo emiten inmediatamente tras `touchend`; además, el reinicio en el siguiente `touchstart` cubre el caso normal. Si apareciera, se puede ampliar la ventana sin cambiar el diseño.
- **Un click de ratón dentro de la ventana se ignora en un híbrido** → la ventana es corta y solo se activa tras un gesto táctil; el siguiente click funciona.
- **Un toque durante la animación puede seguir ignorándose** → es deliberado: el contenido se está moviendo. El primer toque tras la animación sí se procesa.
- **Sin tests de UI automatizados** → verificación manual con la matriz de `tasks.md`, más `typecheck`, `lint`, `test` y `build`.

## Migration Plan

No hay migración de datos, configuración ni API. El cambio se despliega con el build habitual de la web y se revierte revirtiendo el commit de implementación.
