# Tasks

## 1. Esquema, configuración y migración

- [x] 1.1 Añadir `feeds` y `feed_settings` a `apps/api/src/db/schema.ts` con los campos del diseño (`url`, `titulo`, `sitio_url`, `orden`, `actualizado_en`, `ultimo_intento_en`, `error`, `etag`, `last_modified`, `entradas` JSON; `intervalo_min` por usuario) y las relaciones en cascada; verificar con `npm run typecheck --workspace @tolochahome/api` y `npm run db:generate --workspace @tolochahome/api`.
- [x] 1.2 Añadir `FEEDS_ALLOW_PRIVATE` a `apps/api/src/config/env.ts` y a `AppConfig`, con el mismo tratamiento que `PREVIEW_ALLOW_PRIVATE`; verificar con `npm run typecheck --workspace @tolochahome/api` y un test/chequeo de que el valor por defecto es `false`.
- [x] 1.3 Revisar la migración Drizzle generada y comprobar que `runMigrations` crea ambas tablas en una base temporal; verificar con `npm test --workspace @tolochahome/api` y una consulta a `sqlite_master`.

## 2. Descarga, autodescubrimiento y parseo

- [x] 2.1 Añadir `fast-xml-parser` a `apps/api/package.json` y actualizar el lockfile; verificar con `npm install` y `npm audit --omit=dev --audit-level=high`.
- [x] 2.2 Implementar en `apps/api/src/lib/feeds.ts` la normalización de URLs (`feed://`, esquema ausente, solo `http`/`https`), la descarga con timeout de 8 s, tope de 2 MB por streaming, `User-Agent`, `Accept`, `ETag`/`Last-Modified` y seguimiento manual de hasta 5 redirecciones con validación SSRF en cada salto; verificar con tests unitarios de esquemas, host privado, redirección privada, timeout y respuesta demasiado grande.
- [x] 2.3 Implementar el parseo de RSS 2.0, Atom y RSS 1.0/RDF, la detección de codificación (cabecera HTTP, declaración XML, UTF-8), la conversión de HTML a texto plano, la resolución de enlaces relativos, la deduplicación, el orden por fecha y el corte a 30 entradas; verificar con tests de los tres formatos, ISO-8859-1, CDATA, HTML en el resumen, enlaces relativos y feeds con más de 30 publicaciones.
- [x] 2.4 Implementar el autodescubrimiento de `<link rel="alternate">` RSS/Atom en respuestas HTML, resolviendo el `href` contra la URL de la página y rechazando HTML sin feed; verificar con un servidor HTTP local que cubra feed directo, HTML con alternate absoluto, HTML con alternate relativo y HTML sin alternate.
- [x] 2.5 Rechazar documentos con `<!DOCTYPE`/`<!ENTITY` y XML mal formado, y comprobar que un fallo de parseo no guarda una suscripción nueva; verificar con tests de XML inválido, entidad externa y DOCTYPE.

## 3. API de feeds

- [x] 3.1 Implementar `apps/api/src/routes/feeds.ts` con `GET /feeds` (entradas y refresco de viejos), `GET /feeds?resumen=1` (metadatos sin refrescar), `POST /feeds` (alta con autodescubrimiento), `DELETE /feeds/:id`, `PUT /feeds/ajustes` y `POST /feeds/refrescar`; verificar con tests de CRUD, autenticación, aislamiento por usuario, duplicados, límite de 50 y validación del intervalo.
- [x] 3.2 Implementar la política de refresco: cálculo de feed viejo con `intervaloMin`, espera tras error con `ultimoIntentoEn`, `Map` de descargas en vuelo, concurrencia 4, `304` sin reemplazar entradas y conservación de la caché ante error; verificar con tests que manipulen `actualizado_en`/`ultimo_intento_en` y con un servidor que devuelva `304` y errores.
- [x] 3.3 Montar el router en `apps/api/src/app.ts` y unificar los códigos de error en español (`FEED_INVALIDO`, `FEED_DUPLICADO`, `DEMASIADOS_FEEDS`, `FEED_NO_ENCONTRADO`, `FEED_NO_DISPONIBLE`); verificar con tests de formato `{ error: { codigo, mensaje } }`.
- [x] 3.4 Documentar los endpoints, parámetros y códigos en `docs/api.md`; verificar que la tabla coincide con las rutas montadas y con los tests.

## 4. Web: página Feeds y cabecera

- [x] 4.1 Añadir `apps/web/src/hooks/useFeeds.ts` con la query completa (`GET /feeds`), la query resumida (`GET /feeds?resumen=1`), las mutaciones de alta/borrado/ajustes/refresco y la invalidación de `["feeds"]`; verificar con `npm run typecheck --workspace @tolochahome/web`.
- [x] 4.2 Añadir `IconoFeeds` a `Iconos.tsx`, el `NavLink` a `/feeds` junto al chip del tiempo en `AppShell.tsx` (visible con sesión) y la ruta protegida en `App.tsx`; verificar con `npm run typecheck --workspace @tolochahome/web` y en el navegador que el icono marca el estado activo y tiene etiqueta accesible.
- [x] 4.3 Implementar `usePlegadosFeeds` con el conjunto de IDs desplegados en `localStorage` (clave por usuario), `SeccionFeed.tsx` con el patrón de persiana, las 10 entradas visibles, el botón «Ver las 30», el estado vacío y el aviso de error, y `Feeds.tsx` con la lista, el botón «Actualizar» y el estado vacío con enlace a `/config`; verificar en el navegador el plegado por defecto, la persistencia al recargar y los estados vacío/error.
- [x] 4.4 Añadir el formateo de fechas relativas y la apertura de enlaces según `leerApertura()` (misma o nueva pestaña), con `rel="noopener noreferrer"`; verificar en el navegador con ambas preferencias y con una entrada sin fecha.
- [x] 4.5 Comprobar en la pestaña de red que abrir la portada, `/config` o `/gestion` no descarga feeds y que solo `/feeds` dispara el refresco perezoso; verificar que la cabecera no hace peticiones de feeds.

## 5. Web: gestión en Configuración

- [x] 5.1 Implementar `GestionFeeds.tsx` con el formulario de alta por URL, el listado con título/URL y botón de borrado, el selector de intervalo (15 min, 30 min, 1 h, 3 h, 6 h, 12 h) y los mensajes de error en español; añadirlo a `Config.tsx`; verificar en el navegador el alta, el borrado, el cambio de intervalo y el error con una URL sin feed.
- [x] 5.2 Comprobar que `GestionFeeds` usa `GET /feeds?resumen=1` y no provoca descargas al abrir `/config`; verificar en la pestaña de red y con `npm run typecheck --workspace @tolochahome/web` y `npm run lint`.
- [x] 5.3 Actualizar `docs/arquitectura.md` con las tablas `feeds`/`feed_settings` y el módulo de descarga/parseo; verificar que el inventario de almacenamiento y la descripción de la startpage mencionan los feeds.

## 6. Verificación e integración

- [x] 6.1 Ejecutar `npm run verify` (typecheck, lint, test y build) y `openspec validate "feature-c5e3ebd0-lector-rapido-de-noticias-rss" --type change`; verificar que todo termina sin errores.
- [x] 6.2 Reconstruir el contenedor con `docker compose up --build -d` y comprobar `/api/v1/health` y que `/feeds` sirve la SPA; verificar el arranque y las migraciones en los logs.
- [x] 6.3 Probar manualmente con un feed directo (por ejemplo El País) y un alta por URL de sitio con autodescubrimiento (por ejemplo Xataka): comprobar 30 entradas cacheadas, 10 visibles + «Ver las 30», botón «Actualizar», persistencia del plegado y aviso al añadir una URL inválida.
- [x] 6.4 Revisar `git diff --stat` y `git status`: solo deben aparecer los archivos previstos de API, web, docs, dependencias y OpenSpec; comprobar que no se ha colado ningún secreto ni `.env`.
- [x] 6.5 Ejecutar `npm audit --omit=dev --audit-level=high` y verificar que no hay vulnerabilidades altas o críticas en producción.

## Workflow follow-up

- Commitear todo el código, las specs y la documentación en la rama `dev` antes de archivar; verificar con `git status` que no queda nada sin commitear.
- Archivar el change con `/opsx-archive` cuando la revisión esté aprobada y comprobar que la spec `feeds` se sincroniza con `openspec/specs/feeds/spec.md` y la delta de `navegacion` con `openspec/specs/navegacion/spec.md`.
- Tras fusionar `dev` en `main`, subir versión `minor` con `node scripts/bump.js minor`, esperar al check `quality` y publicar el tag según `AGENTS.md`.
