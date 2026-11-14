# Arquitectura

> [← Volver al README](../README.md)

## Vista general

Monorepo npm con workspaces:

```
apps/
├── api/    API REST Express 5 (TypeScript, zod, drizzle-orm + better-sqlite3, jose, bcryptjs)
└── web/    Interfaz React (Vite, Tailwind 4, React Router, TanStack Query, Zustand)
```

La API sirve también el frontend compilado (`STATIC_DIR`) con fallback SPA.
En desarrollo, Vite hace proxy de `/api` a la API.

## Componentes clave (previsto)

- **Almacenamiento**: SQLite vía Drizzle (`users`, `refresh_tokens`,
  `password_reset_tokens`, `groups`, `bookmarks`, `search_engines`,
  `weather_locations`, `feeds`, `feed_settings`).
- **Sesiones**: access token JWT (15 min) en memoria + cookie httpOnly
  `tolocha-refresh` rotatoria. `REGISTRATION_ENABLED=false` cierra el alta.
- **Startpage**: grupos + speed dial de favoritos con previsualización
  (favicon / og:image o inicial), contador de visitas, búsqueda directa
  (Google, Wikipedia, DuckDuckGo + personalizados), lector rápido de feeds
  RSS/Atom y tema `auto|light|dark`.
- **Feeds RSS/Atom**: descarga y parseo en la API (`lib/feeds.ts`), con
  autodescubrimiento desde la URL del sitio, caché de hasta 30 entradas por
  feed en SQLite y refresco perezoso al abrir `/feeds`; usa
  `fast-xml-parser` y guarda SSRF en las descargas.
- **Cita del día**: la API (`lib/cita.ts`) lee la plantilla diaria
  `Plantilla:MMDD` de es.wikiquote (CC BY-SA 4.0) por la API de MediaWiki, con
  `User-Agent: TolochaHome/cita`, y la guarda en memoria hasta que cambia el día
  (zona horaria del servidor). Como mucho una petición al día; si Wikimedia
  falla se sirve la última cita y no se reintenta hasta pasados 10 min. El
  navegador nunca habla con Wikimedia. No usa tablas de SQLite.
- **Import/export**: Netscape HTML (intercambio con navegadores) + JSON propio.

## Referencia rápida

| Tema | Documento |
| --- | --- |
| Instalación y arranque | [instalacion](instalacion.md) |
| Despliegue + proxy inverso | [despliegue](despliegue.md) |
| API REST | [api](api.md) |
| Desarrollo y release | [desarrollo](desarrollo.md) |
