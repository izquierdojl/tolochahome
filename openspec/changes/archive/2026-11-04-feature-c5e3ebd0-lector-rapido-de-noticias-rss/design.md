# Design

## Context

Ver `proposal.md` para la motivación y `specs/feeds/spec.md` / `specs/navegacion/spec.md` para los requisitos de comportamiento.

Estado actual relevante:

- `apps/web/src/components/AppShell.tsx` concentra la cabecera: logo centrado, chip del tiempo, conmutador de tema y navegación por iconos con menú desplegable en móvil.
- `apps/web/src/pages/Config.tsx` agrupa ajustes de cliente y secciones de servidor; `GestionCiudades.tsx` es el patrón de alta, listado, borrado y ordenación.
- `apps/web/src/components/SeccionGrupo.tsx` y `usePlegados.ts` ya implementan persianas plegables y persistencia del plegado por usuario en `localStorage`.
- `apps/api/src/lib/preview.ts` ya resuelve descargas de servidor con timeout, tope de tamaño y guarda SSRF básica (`hostPublico`).
- `apps/api` usa Express 5, zod, Drizzle + better-sqlite3 y migraciones automáticas al arrancar. No hay colas, cron ni procesos en segundo plano.
- Los feeds no se pueden leer desde el navegador en la mayoría de los casos: de cinco medios españoles probados, tres no envían cabeceras CORS. La descarga debe hacerla la API.
- La app es de una sola instancia y autohospedada; el volumen esperado es doméstico (decenas de feeds, no miles).

## Goals / Non-Goals

**Goals:**

- Descargar, parsear y cachear RSS 2.0, Atom y RSS 1.0/RDF en la API, con normalización común y texto plano.
- Refrescar solo cuando el usuario abre `/feeds` o mantiene la página abierta, respetando un intervalo por usuario.
- Permitir alta por URL de feed o de sitio con autodescubrimiento, sin convertirlo en un gestor complejo.
- Mantener la portada y la configuración rápidas: la cabecera no debe consultar feeds ni disparar descargas.
- Proteger la descarga frente a SSRF, XML malicioso, contenido enorme y enlaces no web.

**Non-Goals:**

- Estado de leídos/no leídos, badges, contadores de nuevas publicaciones o sincronización entre dispositivos.
- Imágenes, vídeos, podcasts, extracción del artículo completo o previsualizaciones.
- OPML, import/export de feeds, JSON Feed, carpetas de feeds o compartir suscripciones.
- Renombrar o reordenar feeds en esta primera versión.
- Refresco en segundo plano con la aplicación cerrada.
- Cambiar el esquema de import/export de marcadores.

## Decisions

### 1. Descarga en la API y refresco perezoso, sin scheduler

La API descarga y parsea los feeds. El navegador solo consume JSON propio. El refresco ocurre al abrir `/feeds` y en cada intervalo mientras la página siga abierta; no hay temporizadores globales ni trabajos al arrancar.

Alternativas descartadas:

- **Fetch directo desde el navegador**: falla por CORS en la mayoría de medios y expondría la lógica de parseo al cliente.
- **Scheduler en el servidor**: descargaría feeds de usuarios inactivos, multiplicaría el tráfico y no aporta nada sin contadores de no leídos.
- **Cola/cron externo**: complejidad operativa desproporcionada para una instancia doméstica.

Consecuencia aceptada: la primera apertura tras mucho tiempo puede tardar lo que tarden los feeds viejos. Se acota con timeout por feed y concurrencia limitada; si un feed falla o tarda, se devuelve su última copia y se marca el error.

### 2. Dos tablas: `feeds` y `feed_settings`, entradas como JSON

```text
feeds
  id TEXT PK
  user_id TEXT FK users(id) ON DELETE CASCADE
  url TEXT                 -- URL real del feed, normalizada
  titulo TEXT              -- detectado del feed; fallback al host
  sitio_url TEXT           -- pagina del medio, si se conoce
  orden INTEGER
  actualizado_en INTEGER   -- ultima descarga/304 correcta (epoch ms)
  ultimo_intento_en INTEGER
  error TEXT               -- ultimo error, NULL si todo bien
  etag TEXT
  last_modified TEXT
  entradas TEXT NOT NULL   -- JSON con las ultimas 30 entradas

feed_settings
  user_id TEXT PK FK users(id) ON DELETE CASCADE
  intervalo_min INTEGER NOT NULL DEFAULT 30
```

Cada entrada del JSON tiene `id`, `titulo`, `enlace`, `resumen` y `publicadoEn`. Se guardan las 30 más recientes, ordenadas de más nueva a más antigua. Las entradas son una caché de solo lectura: no se consultan individualmente ni tienen estado propio.

Alternativas descartadas:

- **Tabla `feed_entries` normalizada**: más correcta si hubiera leídos/no leídos o búsqueda por entrada, pero añade joins, limpieza y migración para algo que hoy se reemplaza entero en cada refresco.
- **Caché solo en memoria**: se pierde al reiniciar y no permite mostrar la última copia cuando el medio falla.
- **Guardar el HTML completo**: innecesario, arriesgado y contrario al alcance de “texto facilitado por el medio”.

`orden` se asigna al crear (`max + 1`) para mantener un orden estable, aunque en v1 no haya controles de reordenación. La clave única lógica es `(user_id, url)`; la API normaliza antes de comparar y la migración puede respaldarla con un índice único.

### 3. API: lectura, escritura y refresco separados

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/api/v1/feeds` | Lista con entradas cacheadas; refresca los feeds viejos antes de responder. Lo usa `/feeds`. |
| `GET` | `/api/v1/feeds?resumen=1` | Lista sin entradas y sin refrescar. Lo usa `/config` y cualquier consumidor que solo necesite metadatos. |
| `POST` | `/api/v1/feeds` | Alta por URL de feed o de sitio, con autodescubrimiento y validación. |
| `DELETE` | `/api/v1/feeds/:id` | Baja de una suscripción propia. |
| `PUT` | `/api/v1/feeds/ajustes` | Cambia `intervaloMin` del usuario. |
| `POST` | `/api/v1/feeds/refrescar` | Fuerza el refresco de todos los feeds; botón «Actualizar». |

Respuesta principal:

```json
{
  "feeds": [
    {
      "id": "uuid",
      "titulo": "El Pais",
      "url": "https://feeds.elpais.com/...",
      "sitioUrl": "https://elpais.com",
      "orden": 0,
      "actualizadoEn": 1760000000000,
      "error": null,
      "entradas": [
        {
          "id": "guid-o-hash",
          "titulo": "Titular",
          "enlace": "https://elpais.com/...",
          "resumen": "Texto plano...",
          "publicadoEn": 1760000000000
        }
      ]
    }
  ],
  "ajustes": { "intervaloMin": 30 }
}
```

La variante `?resumen=1` omite `entradas` y no toca la red. Esto evita que abrir `/config` dispare descargas y permite que la cabecera no necesite consultar feeds para decidir si muestra el icono.

Alternativas descartadas:

- **`GET /feeds/:id/entradas` por persiana**: escalaría mejor con muchos feeds, pero multiplica peticiones y estados de carga. Para el volumen esperado, una sola respuesta es más simple.
- **`POST /feeds/refrescar` como única vía de lectura**: obliga a usar un método de escritura para pintar la página; se prefiere `GET` con refresco de caché y dejar el `POST` para la acción manual.

### 4. Pipeline de descarga y parseo

`apps/api/src/lib/feeds.ts` concentra la lógica:

1. **Normalización de URL**: recortar, convertir `feed://` en `https://`, anteponer `https://` si falta esquema y exigir `http`/`https`.
2. **Descarga segura**: timeout de 8 s, `User-Agent` identificable, `Accept` de RSS/Atom/XML/HTML, `If-None-Match`/`If-Modified-Since` cuando haya caché, y seguimiento manual de hasta 5 redirecciones validando cada destino.
3. **Tope de tamaño**: 2 MB. Se lee por streaming y se aborta al superar el límite, sin confiar solo en `Content-Length`.
4. **Detección de tipo**: si el cuerpo empieza por XML o el `Content-Type` es XML/RSS/Atom, se parsea como feed. Si es HTML, se busca `<link rel="alternate">` con tipo RSS/Atom y se descarga el `href` resuelto. Si el HTML no ofrece alternate, error de alta.
5. **Codificación**: `charset` de la cabecera HTTP, luego declaración XML, luego UTF-8; `TextDecoder` y eliminación de BOM.
6. **Parseo**: `fast-xml-parser` con atributos habilitados y arrays forzados para `item`/`entry`. Se soportan `rss.channel`, `feed` y `rdf:RDF`.
7. **Normalización de entradas**: título, enlace (resuelto contra la URL del feed), resumen (`description`, `summary`, `content` o `content:encoded`) y fecha (`pubDate`, `published`, `updated`, `dc:date`). Se deduplica por guid/enlace, se ordena por fecha descendente y se corta a 30.
8. **Texto plano**: se eliminan etiquetas y scripts, se convierten saltos de párrafo en espacios, se decodifican entidades comunes y se colapsan espacios. El resumen se trunca a ~400 caracteres antes de guardarlo.

Se rechazan documentos con `<!DOCTYPE` o `<!ENTITY` para evitar expansión de entidades y XXE. `fast-xml-parser` se configura sin resolución de entidades externas.

Alternativas descartadas:

- **`rss-parser`**: API cómoda, pero arrastra `xml2js` y menos control sobre límites y entidades.
- **Parser propio con regex**: frágil con CDATA, namespaces y Atom.
- **Añadir `node-html-parser` solo para autodescubrimiento**: se evita una dependencia extra con un lector tolerante de etiquetas `<link>` y atributos; si el HTML real se complica, se puede incorporar más adelante.

### 5. Seguridad de la descarga y del contenido

- Todas las rutas exigen `requireAuth` y filtran por `user_id`; una suscripción ajena responde `404`.
- Se reutiliza `hostPublico` de `preview.ts` para rechazar hosts que resuelvan a red privada, loopback, link-local o multicast. La comprobación se repite en cada redirección.
- `FEEDS_ALLOW_PRIVATE=true` permite feeds locales (FreshRSS/Miniflux) y los tests con servidor HTTP local. Sin la variable, se rechazan.
- Solo se aceptan enlaces `http`/`https`; los enlaces con otros esquemas no se renderizan como clicables.
- El resumen se guarda ya como texto plano y React lo escapa al pintarlo. No se usa `dangerouslySetInnerHTML` ni se muestran imágenes/enclosures.
- El `User-Agent` identifica la app; no se envían cookies ni credenciales del usuario a los medios.

Riesgo residual: la comprobación DNS y la conexión posterior pueden resolver de nuevo el mismo nombre (DNS rebinding). Es el mismo límite que ya tiene la previsualización de marcadores; se acepta para una instancia autenticada y autohospedada, y se puede endurecer en el futuro fijando la IP resuelta.

### 6. Política de refresco y errores

- `intervaloMin` se valida entre 15 y 720 minutos (12 h); por defecto 30.
- Un feed está viejo si `actualizadoEn` es nulo o `ahora - actualizadoEn >= intervaloMin * 60000`.
- Si el último intento falló y `ahora - ultimoIntentoEn < intervaloMin * 60000`, no se reintenta en cada petición; se espera al siguiente intervalo. Así un medio caído no se martillea al recargar.
- Un `Map` de promesas en vuelo por `feed.id` evita descargas duplicadas si coinciden dos peticiones.
- `GET /feeds` refresca los feeds viejos con un pool de concurrencia de 4 y `Promise.allSettled`. Un fallo no cancela el resto.
- En éxito o `304` se actualizan `actualizadoEn`, `ultimoIntentoEn` y se limpia `error`. En fallo se actualizan `ultimoIntentoEn` y `error`, y se conservan `entradas`, `etag`, `lastModified` y `actualizadoEn`.
- `POST /feeds/refrescar` ignora la comprobación de intervalo y fuerza todos los feeds; lo usa el botón «Actualizar».
- No hay scheduler: si nadie abre `/feeds`, no hay descargas.

### 7. Interfaz web

- **Cabecera**: `IconoFeeds` (RSS) en `Iconos.tsx`, visible con sesión junto al chip del tiempo. Es un `NavLink` a `/feeds` con estado activo. No consulta feeds: al mostrarse siempre con sesión, no rompe el refresco perezoso. En móvil permanece fuera del panel de menú.
- **Ruta**: `/feeds` dentro de `RequireAuth`, en `apps/web/src/App.tsx`.
- **Página**: `Feeds.tsx` usa `useFeeds()` con `refetchInterval` igual a `ajustes.intervaloMin` y `refetchOnWindowFocus`. Muestra cabecera, botón «Actualizar» (mutación a `POST /feeds/refrescar`), estado vacío con enlace a `/config` y una `SeccionFeed` por suscripción.
- **Persianas**: `SeccionFeed.tsx` replica el patrón visual de `SeccionGrupo` (chevron, título, estado, borde). Por defecto todas plegadas. Se guardan los IDs desplegados en `localStorage` con clave `tolochahome-feeds-desplegados:${userId}` mediante un hook `usePlegadosFeeds`; a diferencia de los grupos, se persiste el conjunto de abiertos para que el estado inicial vacío signifique “todo plegado”.
- **Entradas**: al desplegar se muestran 10; si hay más, botón «Ver las 30». Cada entrada pinta título como enlace, resumen con `line-clamp-3`, fecha relativa y dominio. Sin imágenes. El enlace respeta `leerApertura()` de `MosaicoFavorito.tsx` (`_blank` o misma pestaña, con `rel="noopener noreferrer"`).
- **Configuración**: `GestionFeeds.tsx` se añade a `Config.tsx`. Usa `GET /feeds?resumen=1` para listar sin refrescar, un formulario de alta por URL, botón de borrado y un `select` de intervalo. Invalida las queries `["feeds"]` tras crear, borrar o cambiar ajustes.
- **Fechas**: helper con `Intl.RelativeTimeFormat("es", { numeric: "auto" })`; si no hay fecha, se omite. El estado de la persiana muestra «Actualizado hace…» o el error.
- **Estados**: sin feeds, estado vacío; feed con error y caché, aviso y última copia; feed sin entradas, «Sin publicaciones»; carga inicial, texto de carga.

### 8. Contrato y errores

- Las respuestas de error mantienen `{ error: { codigo, mensaje } }` y mensajes en español.
- Códigos previstos: `DATOS_INVALIDOS`, `FEED_INVALIDO`, `FEED_DUPLICADO`, `DEMASIADOS_FEEDS`, `FEED_NO_ENCONTRADO`, `FEED_NO_DISPONIBLE`, `FEED_NO_ACTUALIZADO`.
- `POST /feeds` responde `201` con el feed creado; `DELETE` responde `{ ok: true }`; los ajustes responden `{ ajustes: { intervaloMin } }`.
- El error de un feed no es un error HTTP de la lista: viaja en `feed.error` para que la página siga mostrando el resto.

## Risks / Trade-offs

- **[Primera apertura lenta con muchos feeds viejos]** → timeout de 8 s por feed, concurrencia 4 y respuesta con la última copia si algo falla; si el volumen crece, se puede pasar a refresco en segundo plano con revalidación.
- **[Respuesta grande con 30 entradas × 50 feeds]** → `resumen=1` para configuración, tope de 50 feeds, resumen truncado y migración futura a carga por persiana si hiciera falta.
- **[Medios que bloquean la IP del servidor]** → `User-Agent` identificable, `ETag`/`Last-Modified`, respeto del intervalo y error visible sin romper la página.
- **[SSRF o rebinding DNS]** → `hostPublico` en URL inicial y redirecciones, solo `http`/`https`, `FEEDS_ALLOW_PRIVATE` explícito y timeout. Riesgo residual documentado.
- **[XML malicioso o enorme]** → tope de 2 MB, rechazo de `DOCTYPE`/`ENTITY`, parser sin entidades externas y timeout.
- **[Variedad de formatos y HTML mal formado]** → normalizadores tolerantes, fallback de campos y tests con RSS 2.0, Atom, RDF, ISO-8859-1 y autodescubrimiento.
- **[Autodescubrimiento por regex]** → se leen etiquetas `<link>` y atributos de forma tolerante; si no hay coincidencia, el usuario recibe un error que le pide la URL directa del feed.
- **[Sin imágenes ni contenido completo]** → decisión de producto: menos peso y menos riesgo legal; el enlace lleva al medio.
- **[Feeds duplicados entre usuarios]** → cada cuenta descarga su propia copia; aceptable en una instancia doméstica. Una caché compartida por URL sería una optimización posterior.

## Migration Plan

1. Añadir `feeds` y `feed_settings` a `schema.ts` y generar la migración Drizzle.
2. Al arrancar, `runMigrations` crea las tablas; no hay backfill ni datos previos que transformar.
3. `FEEDS_ALLOW_PRIVATE` es opcional; sin ella el comportamiento seguro es rechazar redes privadas.
4. Desplegar con `docker compose up --build -d`; comprobar `/api/v1/health` y que `/feeds` sirve la SPA.
5. Rollback: revertir el código y dejar las tablas sin uso o eliminarlas con una migración posterior. No hay datos de usuario que migrar.
