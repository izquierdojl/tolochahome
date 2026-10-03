# API REST

> [← Volver al README](../README.md)

Documento vivo: se concreta en cada change (un change = una capacidad).
Prefijo: `/api/v1`.

## Previsto

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/v1/health` | Salud (sin auth) |
| `POST` | `/api/v1/auth/registro` | Alta (respeta `REGISTRATION_ENABLED`) |
| `POST` | `/api/v1/auth/login` | Login, emite refresh en cookie httpOnly |
| `POST` | `/api/v1/auth/refresh` | Renueva access |
| `POST` | `/api/v1/auth/logout` | Revoca refresh |
| `GET/POST` | `/api/v1/groups` | Listar / crear grupos |
| `PUT/DELETE` | `/api/v1/groups/:id` | Renombrar, reordenar, borrar |
| `GET/POST` | `/api/v1/bookmarks` | Listar / crear favoritos |
| `PUT/DELETE` | `/api/v1/bookmarks/:id` | Editar, mover, borrar, contar visita |
| `GET/POST` | `/api/v1/search-engines` | Listar / crear buscadores |
| `PUT/DELETE` | `/api/v1/search-engines/:id` | Editar / borrar |
| `POST` | `/api/v1/import` | Importar Netscape HTML o JSON |
| `GET` | `/api/v1/export` | Exportar (`?formato=html|json`) |

Errores con formato `{ error: { codigo, mensaje } }` y OpenAPI 3.1 en
`/api/v1/openapi.json` + Swagger UI en `/api/v1/docs` (previsto).
