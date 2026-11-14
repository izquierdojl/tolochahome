# Tasks

## 1. Análisis del wikitext

- [x] 1.1 Crear `apps/api/src/lib/cita.ts` con la separación de entradas del `#switch` y de parámetros de `CitaDía` por profundidad de `{{ }}`/`[[ ]]` (cortando por `|` solo en el nivel superior); verificar con tests en `apps/api/test/cita-lib.test.ts` que `[[a|b]]` dentro del texto no rompe la separación y que `Imagen=` se ignora.
- [x] 1.2 Implementar la limpieza a texto plano (`[[a|b]]`→`b`, `[[a]]`→`a`, `'''`/`''`, plantillas anidadas, etiquetas HTML y `<ref>`, entidades básicas, espacios); verificar con tests de cada caso.
- [x] 1.3 Implementar la selección de entrada (año en curso → `#default` → año más reciente con cita, descartando las entradas que no sean `CitaDía` o no tengan texto/autor) y la construcción de `enlace` (parámetro 3 o, si falta, el 2, con espacios como `_` y codificado); verificar con fragmentos reales de `Plantilla:1114`, `0229` (entradas «no fue bisiesto») y `0315` (sin descripción ni imagen) guardados como fixtures en los tests.

## 2. Servicio con caché y endpoint

- [x] 2.1 Implementar `crearServicioCita({ fetch, ahora })` con la petición a la API de MediaWiki (`Plantilla:MMDD` según la fecha local, timeout de 8 s, `User-Agent: TolochaHome/cita`, límite de 256 KB), la caché por día local, una única promesa en vuelo y la espera de 10 min tras un fallo; verificar con tests de `fetch` simulado: una sola llamada en el mismo día, nueva llamada al cambiar de día, llamadas simultáneas compartidas, cita anterior servida si falla y ningún reintento durante la espera.
- [x] 2.2 Crear `apps/api/src/routes/cita.ts` con `GET /` público (`200 { cita }` con `Cache-Control: public, max-age=600`, o `503 CITA_NO_DISPONIBLE` con `HttpError`) y montarlo en `apps/api/src/app.ts` como `/api/v1/cita`, inyectando el servicio para poder sustituirlo en los tests; verificar con `apps/api/test/cita.test.ts` (supertest) que responde sin token, que tiene la forma de la spec y que da 503 sin cita.
- [x] 2.3 Comprobar que `createTestApp()` y el resto de tests no hacen peticiones reales a Wikimedia (servicio inyectado o `fetch` simulado); verificar con `npm test --workspace @tolochahome/api` sin red.
- [x] 2.4 Documentar `GET /api/v1/cita` (respuesta, 503, caché) en `docs/api.md` y la fuente externa es.wikiquote (CC BY-SA, caché en memoria) en `docs/arquitectura.md`; verificar que la tabla de endpoints coincide con la ruta montada.

## 3. Web: emblema y panel

- [x] 3.1 Añadir `apps/web/src/hooks/useCita.ts` (clave `["cita"]`, `retry: false`, `staleTime` de 10 min, se vuelve a pedir al recuperar el foco si la fecha local es distinta de `data.fecha`, sin depender de la sesión); verificar con `npm run typecheck --workspace @tolochahome/web`.
- [x] 3.2 Añadir `IconoCita` (comillas SVG con `currentColor`) a `Iconos.tsx` y `PanelCita.tsx` (`blockquote`, `cite`, descripción, fecha, atribución «Wikiquote · CC BY-SA 4.0» con enlaces en pestaña nueva y `rel="noopener noreferrer"`); verificar en el navegador en tema claro y oscuro.
- [x] 3.3 Integrar en `AppShell.tsx` el botón tras el chip del tiempo y antes de Feeds, visible con y sin sesión y oculto si no hay datos, con `aria-label`, `aria-expanded`, `aria-controls="panel-cita"`, Escape, clic fuera y devolución del foco, y haciendo que abrir un panel cierre el del tiempo y al revés; verificar en el navegador en `/` con sesión y en `/login` sin sesión, y con la API devolviendo 503 (el emblema no aparece).
- [x] 3.4 Comprobar la cabecera a 320 px y a 400 px con tiempo + cita + feeds: sin solaparse con el logotipo, área táctil de 44 px y emblema fuera del panel de menú; verificar en el navegador con las herramientas de móvil.

## 4. Verificación e integración

- [x] 4.1 Ejecutar `npm run verify` y `openspec validate feature-1ef0666e-cita-del-dia --type change --strict`; verificar que ambos terminan sin errores.
- [x] 4.2 Reconstruir con `docker compose up --build -d` y comprobar `/api/v1/health`, que `/` sirve la web y que `GET /api/v1/cita` devuelve la cita real de hoy desde es.wikiquote; verificar en los logs que una segunda consulta no repite la petición a Wikimedia.
- [x] 4.3 Revisar `git status` y `git diff --stat`: solo deben aparecer los archivos previstos de API, web, docs y OpenSpec, sin `.env` ni secretos.

## Workflow follow-up

- Commitear todo el código, la documentación y las specs en `dev` antes de archivar; verificar con `git status` que no queda nada sin commitear.
- Archivar el change cuando la revisión esté aprobada y comprobar que se crea `openspec/specs/cita/spec.md`.
- Tras fusionar `dev` en `main`, subir la versión `minor` con `node scripts/bump.js minor`, esperar al check `quality` y publicar el tag según `AGENTS.md`.
