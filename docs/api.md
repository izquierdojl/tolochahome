# API REST

> [← Volver al README](../README.md)

Documento vivo: se concreta en cada change (un change = una capacidad).
Prefijo: `/api/v1`.

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Salud + versión (`{ ok, servicio, version, registroAbierto }`) |
| `POST` | `/api/v1/auth/registro` | Alta (respeta `REGISTRATION_ENABLED`) |
| `POST` | `/api/v1/auth/login` | Login, emite refresh en cookie httpOnly |
| `POST` | `/api/v1/auth/refresh` | Renueva access (rotación con gracia) |
| `POST` | `/api/v1/auth/logout` | Revoca refresh (idempotente) |
| `GET` | `/api/v1/auth/yo` | Perfil básico (requiere sesión) |
| `POST` | `/api/v1/auth/password/reset-request` | Solicita reset (siempre éxito) |
| `POST` | `/api/v1/auth/password/reset-confirm` | Fija nueva contraseña |
| `GET/POST` | `/api/v1/groups` | Listar (con conteo) / crear grupos |
| `PUT/DELETE` | `/api/v1/groups/:id` | Renombrar (nombre, color), reordenar, borrar |
| `GET/POST` | `/api/v1/bookmarks` | Listar (`?grupo=`) / crear favoritos |
| `PUT/DELETE` | `/api/v1/bookmarks/:id` | Editar (incluye `imagen`), mover, borrar |
| `POST` | `/api/v1/bookmarks/:id/visita` | Incrementa contador de visitas |
| `POST/DELETE` | `/api/v1/bookmarks/:id/imagen` | Subir / quitar imagen propia |
| `GET` | `/api/v1/imagenes/<fichero>` | Sirve imagen privada (requiere sesión) |
| `POST` | `/api/v1/bookmarks/previsualizar` | Título + og:image de una URL |
| `GET/POST` | `/api/v1/search-engines` | Listar (con semillas) / crear buscadores |
| `PUT/DELETE` | `/api/v1/search-engines/:id` | Editar / borrar |
| `GET/POST` | `/api/v1/weather-locations` | Listar / crear ciudades del tiempo |
| `PUT/DELETE` | `/api/v1/weather-locations/:id` | Editar (nombre, orden, por defecto) / borrar |
| `GET` | `/api/v1/feeds` | Listar feeds con entradas; refresca los viejos. `?resumen=1` omite entradas y no refresca |
| `POST` | `/api/v1/feeds` | Añadir feed por URL directa o de sitio con autodescubrimiento |
| `DELETE` | `/api/v1/feeds/:id` | Borrar una suscripción propia |
| `PUT` | `/api/v1/feeds/ajustes` | Cambiar el intervalo de actualización (15–720 min) |
| `POST` | `/api/v1/feeds/refrescar` | Forzar la actualización de todos los feeds |
| `GET` | `/api/v1/sugerencias?motor=&q=` | Sugerencias normalizadas |
| `POST` | `/api/v1/import` | Importar Netscape HTML o JSON |
| `GET` | `/api/v1/export?formato=html\|json` | Exportar como adjunto |

Errores con formato `{ error: { codigo, mensaje } }` en español.

Los feeds se descargan y parsean en la API (RSS 2.0, Atom y RSS 1.0/RDF). El alta acepta la URL del feed o la del sitio con autodescubrimiento y guarda hasta 30 entradas por feed. Por defecto se rechazan hosts de red privada; `FEEDS_ALLOW_PRIVATE=true` permite feeds locales.

> Pendiente: OpenAPI 3.1 en `/api/v1/openapi.json` + Swagger UI en `/api/v1/docs`.
