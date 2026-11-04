# Proposal

## Why

TolochaHome ya cubre favoritos, búsqueda y tiempo, pero no permite seguir la actualidad de los medios que le interesan al usuario sin salir de la startpage. Un lector rápido de RSS/Atom, sin estado de leídos ni gestor complejo, añade ese uso sin convertir la portada en una aplicación de noticias: el usuario configura sus canales una vez y consulta los últimos titulares cuando quiere.

## What Changes

- Nueva página `/feeds`, accesible desde un icono en la cabecera junto al chip del tiempo, con una persiana plegable por suscripción. Al desplegarla se muestran las 10 publicaciones más recientes y un botón «Ver las 30» para revelar el resto.
- Cada publicación muestra título, un resumen en texto plano facilitado por el medio, fecha relativa y enlace al artículo original. Sin imágenes, vídeos, podcasts, contenido completo, estado de leídos ni contadores.
- Nueva sección «Feeds» en `/config` para añadir canales por URL, borrarlos y elegir el periodo de actualización (15 min, 30 min, 1 h, 3 h, 6 h o 12 h; 30 min por defecto).
- El alta acepta tanto la URL directa del feed como la URL del sitio: si la respuesta es HTML, se busca `<link rel="alternate">` con tipo RSS/Atom; si no se encuentra o no se puede parsear, no se guarda y se explica el motivo.
- La API descarga, parsea y cachea los feeds en SQLite. Soporta RSS 2.0, Atom y RSS 1.0/RDF, con detección de codificación, `ETag`/`Last-Modified`, timeout, límite de tamaño, concurrencia acotada y guarda SSRF.
- Refresco perezoso: al abrir `/feeds` se actualizan los feeds viejos y, mientras la página sigue abierta, se vuelve a consultar cada intervalo. No hay refresco en segundo plano con la app cerrada.
- Hasta 50 feeds por usuario y 30 entradas cacheadas por feed. Si un feed falla, se mantiene la última copia y se marca el error en su persiana.
- Nueva dependencia de producción `fast-xml-parser` para el parseo XML.

## Capabilities

### New Capabilities

- `feeds`: suscripciones RSS/Atom por usuario, alta con autodescubrimiento, refresco perezoso con caché, página `/feeds` con persianas y entradas en texto plano.

### Modified Capabilities

- `navegacion`: la cabecera añade el icono de Feeds junto al chip del tiempo y `/config` incorpora la sección de gestión de canales y periodo de actualización.

## Impact

- `apps/api/src/db/schema.ts` y migración Drizzle: nuevas tablas `feeds` y `feed_settings`.
- `apps/api/src/lib/feeds.ts`: descarga, autodescubrimiento, parseo, normalización de entradas y utilidades de seguridad.
- `apps/api/src/routes/feeds.ts` y `apps/api/src/app.ts`: endpoints `/api/v1/feeds` y montaje del router.
- `apps/api/src/config/env.ts`: opción `FEEDS_ALLOW_PRIVATE` para feeds locales o tests.
- `apps/api/test/feeds.test.ts`: cobertura de CRUD, autodescubrimiento, RSS/Atom/RDF, caché, errores y aislamiento por usuario.
- `apps/web/src/pages/Feeds.tsx`, `hooks/useFeeds.ts`, `components/SeccionFeed.tsx` y `components/GestionFeeds.tsx`: página, consultas y gestión.
- `apps/web/src/components/AppShell.tsx`, `Iconos.tsx`, `App.tsx` y `pages/Config.tsx`: icono, ruta y sección de configuración.
- `docs/api.md` y `docs/arquitectura.md`: nuevos endpoints y tablas.
- `package.json` de la API: `fast-xml-parser`.
- Sin cambios en Docker, variables obligatorias ni en el formato de import/export de marcadores.
