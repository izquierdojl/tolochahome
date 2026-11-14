# Proposal

## Why

La cabecera de TolochaHome ya muestra el tiempo y da acceso a los feeds, pero no ofrece nada que invite a detenerse un momento. Una cita diaria de un pensador, político, escritor o filósofo da ese toque sin añadir configuración. Debe salir de una fuente legal y fiable: las APIs de citas habituales están en inglés, tienen términos poco claros o atribuciones falsas, y algunas están abandonadas. La «Cita del día» de es.wikiquote la selecciona la comunidad, está en español, se publica con licencia CC BY-SA 4.0 y se consulta gratis, sin clave, desde la API de MediaWiki.

## What Changes

- Nuevo endpoint público `GET /api/v1/cita` (sin sesión). Devuelve la cita del día: texto, autor, descripción breve del autor, fecha, enlace a la ficha del autor en Wikiquote y datos de atribución (fuente y licencia).
- La API obtiene la cita de la plantilla diaria de es.wikiquote (`Plantilla:MMDD`). Elige la entrada del año en curso y, si no existe, la entrada por defecto. Limpia el marcado wiki y lo deja en texto plano.
- Caché en memoria hasta que cambia el día, con una sola petición a Wikimedia al día como máximo. Si Wikimedia falla, se sirve la última cita obtenida. Si nunca se ha obtenido ninguna, se responde que no hay cita disponible.
- Nuevo emblema de comillas en la cabecera, a la izquierda junto al chip del tiempo, visible con y sin sesión y también en móvil. Al pulsarlo abre un panel con la cita, el autor, su descripción, la fecha y la atribución «Wikiquote · CC BY-SA 4.0» con enlace.
- Si no hay cita disponible, el emblema no se muestra.

## Capabilities

### New Capabilities

- `cita`: cita del día pública, obtenida de es.wikiquote con atribución CC BY-SA, con caché diaria en la API y emblema con panel en la cabecera.

### Modified Capabilities

<!-- Ninguna: el emblema y su panel se especifican en `cita`, igual que el chip del tiempo se especifica en `tiempo`. -->

## Impact

- `apps/api/src/lib/cita.ts` (nuevo): descarga desde la API de MediaWiki, selección de la entrada del año, análisis de `CitaDía`, limpieza del marcado y caché diaria.
- `apps/api/src/routes/cita.ts` (nuevo) y `apps/api/src/app.ts`: router público montado en `/api/v1/cita`.
- `apps/api/test/cita.test.ts` y `apps/api/test/cita-lib.test.ts` (nuevos): análisis con plantillas reales, caché, caída de la fuente y endpoint.
- `apps/web/src/hooks/useCita.ts`, `apps/web/src/components/PanelCita.tsx` (nuevos), `Iconos.tsx` (`IconoCita`) y `AppShell.tsx`: emblema y panel.
- `docs/api.md` y `docs/arquitectura.md`: nuevo endpoint y nueva fuente externa.
- Sin tablas ni migraciones nuevas, sin dependencias nuevas y sin variables de entorno obligatorias.
- Tráfico saliente nuevo desde el servidor hacia `es.wikiquote.org`: como máximo una petición al día mientras alguien consulte la cita.
